<template>
  <div class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Загрузка данных...</p>
        </div>
        <div v-else-if="error" class="error-state">
          <p>❌ {{ error }}</p>
        </div>
        <div v-else-if="!hasData" class="no-data-state">
          <p>📊 Нет данных для отображения</p>
        </div>
        <div v-else class="charts-container">
          <!-- Position Chart -->
          <div v-if="positionData.length > 0" class="chart-section">
            <h3>📍 Позиция</h3>
            <canvas ref="positionChart"></canvas>
          </div>

          <!-- Telemetry Charts -->
          <div v-if="telemetryData.battery.length > 0" class="chart-section">
            <h3>🔋 Батарея</h3>
            <canvas ref="batteryChart"></canvas>
          </div>

          <div v-if="telemetryData.voltage.length > 0" class="chart-section">
            <h3>⚡ Напряжение</h3>
            <canvas ref="voltageChart"></canvas>
          </div>

          <div
            v-if="telemetryData.temperature.length > 0"
            class="chart-section"
          >
            <h3>🌡️ Температура</h3>
            <canvas ref="temperatureChart"></canvas>
          </div>

          <div v-if="telemetryData.humidity.length > 0" class="chart-section">
            <h3>💧 Влажность</h3>
            <canvas ref="humidityChart"></canvas>
          </div>

          <div v-if="telemetryData.pressure.length > 0" class="chart-section">
            <h3>🌪️ Давление</h3>
            <canvas ref="pressureChart"></canvas>
          </div>

          <div
            v-if="telemetryData.channelUtilization.length > 0"
            class="chart-section"
          >
            <h3>📡 Загрузка канала</h3>
            <canvas ref="channelChart"></canvas>
          </div>

          <!-- Signal Quality -->
          <div v-if="signalData.snr.length > 0" class="chart-section">
            <h3>📶 Качество сигнала (SNR/RSSI)</h3>
            <canvas ref="signalChart"></canvas>
          </div>

          <!-- Messages Chart -->
          <div v-if="messagesData.length > 0" class="chart-section">
            <h3>💬 Сообщения</h3>
            <div class="messages-list">
              <div
                v-for="(msg, idx) in messagesData"
                :key="idx"
                class="message-item"
              >
                <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
                <div class="message-text">{{ msg.text }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue";
import { meshtasticApi } from "../utils/api.js";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const props = defineProps({
  nodeId: {
    type: [String, Number],
    required: true,
  },
  deviceName: {
    type: String,
    default: "Устройство",
  },
});

const emit = defineEmits(["close"]);

const title = ref(`Графики: ${props.deviceName}`);
const loading = ref(true);
const error = ref(null);
const hasData = ref(false);

// Data refs
const positionData = ref([]);
const telemetryData = ref({
  battery: [],
  voltage: [],
  temperature: [],
  humidity: [],
  pressure: [],
  channelUtilization: [],
  airUtilTx: [],
});
const signalData = ref({
  snr: [],
  rssi: [],
});
const messagesData = ref([]);

// Chart refs
const positionChart = ref(null);
const batteryChart = ref(null);
const voltageChart = ref(null);
const temperatureChart = ref(null);
const humidityChart = ref(null);
const pressureChart = ref(null);
const channelChart = ref(null);
const signalChart = ref(null);

const chartInstances = [];

const handleOverlayClick = () => {
  emit("close");
};

const formatTime = (timestamp) => {
  if (!timestamp) return "Неизвестно";
  const date = new Date(timestamp);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fetchAllData = async () => {
  try {
    loading.value = true;
    error.value = null;

    // Fetch Position Data
    try {
      const positionInfo = await meshtasticApi.getPositionInfo(props.nodeId);
      if (positionInfo?.data?.length > 0) {
        positionData.value = positionInfo.data
          .filter((d) => d.rawData?.latitude_i && d.rawData?.longitude_i)
          .map((d) => ({
            timestamp: d.timestamp,
            latitude: d.rawData.latitude_i / 1e7,
            longitude: d.rawData.longitude_i / 1e7,
            altitude: d.rawData.altitude,
            sats: d.rawData.sats_in_view,
          }))
          .reverse(); // Oldest first
      }
    } catch (e) {
      console.warn("Position data error:", e);
    }

    // Fetch Telemetry Data
    try {
      const telemetryInfo = await meshtasticApi.getTelemetryInfo(props.nodeId);
      if (telemetryInfo?.data?.length > 0) {
        const battery = [];
        const voltage = [];
        const temperature = [];
        const humidity = [];
        const pressure = [];
        const channelUtilization = [];
        const airUtilTx = [];

        telemetryInfo.data.forEach((entry) => {
          if (entry.rawData?.variant?.value) {
            const val = entry.rawData.variant.value;
            const ts = entry.timestamp;

            if (entry.rawData.type === "deviceMetrics") {
              if (val.battery_level !== undefined) {
                battery.push({
                  timestamp: ts,
                  value: Math.min(val.battery_level, 100),
                });
              }
              if (val.voltage !== undefined) {
                voltage.push({ timestamp: ts, value: val.voltage });
              }
              if (val.channel_utilization !== undefined) {
                channelUtilization.push({
                  timestamp: ts,
                  value: val.channel_utilization,
                });
              }
              if (val.air_util_tx !== undefined) {
                airUtilTx.push({ timestamp: ts, value: val.air_util_tx });
              }
            }

            if (entry.rawData.type === "environmentMetrics") {
              if (val.temperature !== undefined) {
                temperature.push({ timestamp: ts, value: val.temperature });
              }
              if (val.humidity !== undefined) {
                humidity.push({ timestamp: ts, value: val.humidity });
              }
              if (val.pressure !== undefined) {
                pressure.push({ timestamp: ts, value: val.pressure });
              }
            }
          }
        });

        telemetryData.value = {
          battery: battery.reverse(),
          voltage: voltage.reverse(),
          temperature: temperature.reverse(),
          humidity: humidity.reverse(),
          pressure: pressure.reverse(),
          channelUtilization: channelUtilization.reverse(),
          airUtilTx: airUtilTx.reverse(),
        };
      }
    } catch (e) {
      console.warn("Telemetry data error:", e);
    }

    // Fetch Signal Data from all sources
    try {
      const snrData = [];
      const rssiData = [];

      // From Node Info
      const nodeInfo = await meshtasticApi.getNodeInfo(props.nodeId);
      if (nodeInfo?.data?.length > 0) {
        nodeInfo.data.forEach((entry) => {
          if (entry.rxSnr !== undefined && entry.rxSnr !== 0) {
            snrData.push({ timestamp: entry.timestamp, value: entry.rxSnr });
          }
          if (entry.rxRssi !== undefined && entry.rxRssi !== 0) {
            rssiData.push({ timestamp: entry.timestamp, value: entry.rxRssi });
          }
        });
      }

      signalData.value = {
        snr: snrData.reverse(),
        rssi: rssiData.reverse(),
      };
    } catch (e) {
      console.warn("Signal data error:", e);
    }

    // Fetch Text Messages
    try {
      const textMessages = await meshtasticApi.getTextMessages(props.nodeId);
      if (textMessages?.data?.length > 0) {
        messagesData.value = textMessages.data
          .filter((m) => m.rawData?.text)
          .map((m) => ({
            timestamp: m.timestamp,
            text: m.rawData.text,
            to: m.to,
          }))
          .reverse();
      }
    } catch (e) {
      console.warn("Messages data error:", e);
    }

    // Check if we have any data
    hasData.value =
      positionData.value.length > 0 ||
      telemetryData.value.battery.length > 0 ||
      telemetryData.value.voltage.length > 0 ||
      telemetryData.value.temperature.length > 0 ||
      telemetryData.value.humidity.length > 0 ||
      telemetryData.value.pressure.length > 0 ||
      telemetryData.value.channelUtilization.length > 0 ||
      signalData.value.snr.length > 0 ||
      signalData.value.rssi.length > 0 ||
      messagesData.value.length > 0;
  } catch (e) {
    console.error("Error fetching data:", e);
    error.value = "Ошибка загрузки данных";
  } finally {
    loading.value = false;
  }
};

const createChart = (canvasRef, label, data, color, unit = "") => {
  if (!canvasRef || !data.length) return;

  const ctx = canvasRef.getContext("2d");
  const chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map((d) => formatTime(d.timestamp)),
      datasets: [
        {
          label: label,
          data: data.map((d) => d.value),
          borderColor: color,
          backgroundColor: color + "20",
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.parsed.y.toFixed(2)}${unit}`,
          },
        },
      },
      scales: {
        x: {
          display: true,
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: 10,
            },
          },
        },
        y: {
          display: true,
          ticks: {
            callback: (value) => `${value}${unit}`,
          },
        },
      },
    },
  });

  chartInstances.push(chartInstance);
};

const createDualAxisChart = (
  canvasRef,
  label1,
  data1,
  color1,
  label2,
  data2,
  color2
) => {
  if (!canvasRef || (!data1.length && !data2.length)) return;

  const ctx = canvasRef.getContext("2d");

  // Combine timestamps
  const allTimestamps = [
    ...new Set([
      ...data1.map((d) => d.timestamp),
      ...data2.map((d) => d.timestamp),
    ]),
  ].sort();

  const chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: allTimestamps.map((ts) => formatTime(ts)),
      datasets: [
        {
          label: label1,
          data: allTimestamps.map((ts) => {
            const point = data1.find((d) => d.timestamp === ts);
            return point ? point.value : null;
          }),
          borderColor: color1,
          backgroundColor: color1 + "20",
          borderWidth: 2,
          tension: 0.4,
          yAxisID: "y",
          spanGaps: true,
        },
        {
          label: label2,
          data: allTimestamps.map((ts) => {
            const point = data2.find((d) => d.timestamp === ts);
            return point ? point.value : null;
          }),
          borderColor: color2,
          backgroundColor: color2 + "20",
          borderWidth: 2,
          tension: 0.4,
          yAxisID: "y1",
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
        },
      },
      scales: {
        x: {
          display: true,
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: 10,
            },
          },
        },
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: {
            display: true,
            text: label1,
          },
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          title: {
            display: true,
            text: label2,
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  });

  chartInstances.push(chartInstance);
};

const renderCharts = async () => {
  await nextTick();

  // Position Chart (Altitude)
  if (positionData.value.length > 0 && positionChart.value) {
    const altitudeData = positionData.value
      .filter((d) => d.altitude !== undefined)
      .map((d) => ({ timestamp: d.timestamp, value: d.altitude }));

    if (altitudeData.length > 0) {
      createChart(positionChart.value, "Высота", altitudeData, "#3b82f6", " м");
    }
  }

  // Battery Chart
  if (telemetryData.value.battery.length > 0 && batteryChart.value) {
    createChart(
      batteryChart.value,
      "Батарея",
      telemetryData.value.battery,
      "#10b981",
      "%"
    );
  }

  // Voltage Chart
  if (telemetryData.value.voltage.length > 0 && voltageChart.value) {
    createChart(
      voltageChart.value,
      "Напряжение",
      telemetryData.value.voltage,
      "#f59e0b",
      " В"
    );
  }

  // Temperature Chart
  if (telemetryData.value.temperature.length > 0 && temperatureChart.value) {
    createChart(
      temperatureChart.value,
      "Температура",
      telemetryData.value.temperature,
      "#ef4444",
      "°C"
    );
  }

  // Humidity Chart
  if (telemetryData.value.humidity.length > 0 && humidityChart.value) {
    createChart(
      humidityChart.value,
      "Влажность",
      telemetryData.value.humidity,
      "#06b6d4",
      "%"
    );
  }

  // Pressure Chart
  if (telemetryData.value.pressure.length > 0 && pressureChart.value) {
    createChart(
      pressureChart.value,
      "Давление",
      telemetryData.value.pressure,
      "#8b5cf6",
      " hPa"
    );
  }

  // Channel Utilization Chart
  if (telemetryData.value.channelUtilization.length > 0 && channelChart.value) {
    createChart(
      channelChart.value,
      "Загрузка канала",
      telemetryData.value.channelUtilization,
      "#ec4899",
      "%"
    );
  }

  // Signal Quality Chart (SNR + RSSI)
  if (
    (signalData.value.snr.length > 0 || signalData.value.rssi.length > 0) &&
    signalChart.value
  ) {
    createDualAxisChart(
      signalChart.value,
      "SNR (dB)",
      signalData.value.snr,
      "#10b981",
      "RSSI (dBm)",
      signalData.value.rssi,
      "#ef4444"
    );
  }
};

onMounted(async () => {
  await fetchAllData();
  if (hasData.value) {
    await renderCharts();
  }
});

// Cleanup charts on unmount
const cleanup = () => {
  chartInstances.forEach((chart) => {
    if (chart) {
      chart.destroy();
    }
  });
  chartInstances.length = 0;
};

defineExpose({ cleanup });
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  overflow-y: auto;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.modal-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.modal-close:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 24px;
}

.loading-state,
.error-state,
.no-data-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.spinner {
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.charts-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}

.chart-section {
  background: #f9fafb;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.chart-section h3 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 1.125rem;
  font-weight: 600;
}

canvas {
  max-height: 300px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.message-item {
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.message-time {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 4px;
}

.message-text {
  color: #1f2937;
  word-break: break-word;
}

@media (max-width: 768px) {
  .modal-content {
    max-width: 100%;
    max-height: 95vh;
    margin: 10px;
  }

  .modal-header,
  .modal-body {
    padding: 16px;
  }

  .chart-section {
    padding: 16px;
  }
}
</style>
