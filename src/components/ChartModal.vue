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
          <!-- Position Endpoint Block -->
          <div
            v-if="
              positionMessagesPerHour.length > 0 ||
              positionSignalData.snr.length > 0 ||
              positionSignalData.rssi.length > 0 ||
              positionHopLimitData.length > 0
            "
            class="endpoint-block position-block"
          >
            <div
              class="endpoint-header"
              @click="isPositionBlockExpanded = !isPositionBlockExpanded"
            >
              <div class="endpoint-header-content">
                <div>
                  <h2>📍 POSITION_APP</h2>
                  <p class="endpoint-description">
                    Данные о местоположении устройства
                  </p>
                </div>
                <button class="collapse-button" type="button">
                  <span v-if="isPositionBlockExpanded">▼</span>
                  <span v-else>▶</span>
                </button>
              </div>
            </div>
            <div v-if="isPositionBlockExpanded" class="endpoint-charts">
              <div
                v-if="positionMessagesPerHour.length > 0"
                class="chart-section"
              >
                <h3>📊 Частота сообщений (в час)</h3>
                <canvas ref="positionFrequencyChart"></canvas>
              </div>

              <div
                v-if="
                  positionSignalData.snr.length > 0 ||
                  positionSignalData.rssi.length > 0 ||
                  positionHopLimitData.length > 0
                "
                class="chart-section"
              >
                <h3>📶 Качество сигнала (SNR + RSSI + Hop Limit)</h3>
                <canvas ref="positionSignalChart"></canvas>
              </div>
            </div>
          </div>

          <!-- Telemetry Endpoint Block -->
          <div
            v-if="
              hasTelemetryData ||
              telemetryMessagesPerHour.length > 0 ||
              telemetrySignalData.snr.length > 0 ||
              telemetrySignalData.rssi.length > 0 ||
              telemetrySignalData.hopLimit.length > 0
            "
            class="endpoint-block telemetry-block"
          >
            <div
              class="endpoint-header"
              @click="isTelemetryBlockExpanded = !isTelemetryBlockExpanded"
            >
              <div class="endpoint-header-content">
                <div>
                  <h2>📊 TELEMETRY_APP</h2>
                  <p class="endpoint-description">
                    Телеметрия и метрики устройства
                  </p>
                </div>
                <button class="collapse-button" type="button">
                  <span v-if="isTelemetryBlockExpanded">▼</span>
                  <span v-else>▶</span>
                </button>
              </div>
            </div>
            <div v-if="isTelemetryBlockExpanded" class="endpoint-charts">
              <div
                v-if="telemetryMessagesPerHour.length > 0"
                class="chart-section"
              >
                <h3>📊 Частота сообщений (в час)</h3>
                <canvas ref="telemetryFrequencyChart"></canvas>
              </div>

              <div
                v-if="telemetryData.battery.length > 0"
                class="chart-section"
              >
                <h3>🔋 Батарея</h3>
                <canvas ref="batteryChart"></canvas>
              </div>

              <div
                v-if="telemetryData.voltage.length > 0"
                class="chart-section"
              >
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

              <div
                v-if="telemetryData.humidity.length > 0"
                class="chart-section"
              >
                <h3>💧 Влажность</h3>
                <canvas ref="humidityChart"></canvas>
              </div>

              <div
                v-if="telemetryData.pressure.length > 0"
                class="chart-section"
              >
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

              <div
                v-if="
                  telemetrySignalData.snr.length > 0 ||
                  telemetrySignalData.rssi.length > 0 ||
                  telemetrySignalData.hopLimit.length > 0
                "
                class="chart-section"
              >
                <h3>📶 Качество сигнала (SNR + RSSI + Hop Limit)</h3>
                <canvas ref="telemetrySignalChart"></canvas>
              </div>
            </div>
          </div>

          <!-- NodeInfo Endpoint Block -->
          <div
            v-if="
              nodeinfoMessagesPerHour.length > 0 ||
              nodeinfoSignalData.snr.length > 0 ||
              nodeinfoSignalData.rssi.length > 0 ||
              nodeinfoSignalData.hopLimit.length > 0
            "
            class="endpoint-block nodeinfo-block"
          >
            <div
              class="endpoint-header"
              @click="isNodeinfoBlockExpanded = !isNodeinfoBlockExpanded"
            >
              <div class="endpoint-header-content">
                <div>
                  <h2>📶 NODEINFO_APP</h2>
                  <p class="endpoint-description">
                    Информация о качестве сигнала
                  </p>
                </div>
                <button class="collapse-button" type="button">
                  <span v-if="isNodeinfoBlockExpanded">▼</span>
                  <span v-else>▶</span>
                </button>
              </div>
            </div>
            <div v-if="isNodeinfoBlockExpanded" class="endpoint-charts">
              <div
                v-if="nodeinfoMessagesPerHour.length > 0"
                class="chart-section"
              >
                <h3>📊 Частота сообщений (в час)</h3>
                <canvas ref="nodeinfoFrequencyChart"></canvas>
              </div>

              <div
                v-if="
                  nodeinfoSignalData.snr.length > 0 ||
                  nodeinfoSignalData.rssi.length > 0 ||
                  nodeinfoSignalData.hopLimit.length > 0
                "
                class="chart-section"
              >
                <h3>📶 Качество сигнала (SNR + RSSI + Hop Limit)</h3>
                <canvas ref="nodeinfoSignalChart"></canvas>
              </div>
            </div>
          </div>

          <!-- Text Messages Endpoint Block -->
          <div
            v-if="
              messagesData.length > 0 ||
              messagesSignalData.snr.length > 0 ||
              messagesSignalData.rssi.length > 0
            "
            class="endpoint-block messages-block"
          >
            <div
              class="endpoint-header"
              @click="isMessagesBlockExpanded = !isMessagesBlockExpanded"
            >
              <div class="endpoint-header-content">
                <div>
                  <h2>💬 TEXT_MESSAGE_APP</h2>
                  <p class="endpoint-description">
                    Текстовые сообщения от устройства
                  </p>
                </div>
                <button class="collapse-button" type="button">
                  <span v-if="isMessagesBlockExpanded">▼</span>
                  <span v-else>▶</span>
                </button>
              </div>
            </div>
            <div v-if="isMessagesBlockExpanded" class="endpoint-charts">
              <div v-if="messagesData.length > 0" class="chart-section">
                <h3>💬 Сообщения</h3>
                <div class="messages-list">
                  <div
                    v-for="(msg, idx) in messagesData"
                    :key="idx"
                    class="message-item"
                  >
                    <div class="message-time">
                      {{ formatTime(msg.timestamp) }}
                    </div>
                    <div class="message-text">{{ msg.text }}</div>
                  </div>
                </div>
              </div>

              <div
                v-if="
                  messagesSignalData.snr.length > 0 ||
                  messagesSignalData.rssi.length > 0
                "
                class="chart-section"
              >
                <h3>📶 Качество сигнала (SNR/RSSI)</h3>
                <canvas ref="messagesSignalChart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed, watch } from "vue";
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
const positionSignalData = ref({ snr: [], rssi: [] });
const positionHopLimitData = ref([]);
const positionMessagesPerHour = ref([]);

const telemetryData = ref({
  battery: [],
  voltage: [],
  temperature: [],
  humidity: [],
  pressure: [],
  channelUtilization: [],
  airUtilTx: [],
});
const telemetrySignalData = ref({ snr: [], rssi: [], hopLimit: [] });
const telemetryMessagesPerHour = ref([]);

const nodeinfoSignalData = ref({ snr: [], rssi: [], hopLimit: [] });
const nodeinfoMessagesPerHour = ref([]);

const messagesData = ref([]);
const messagesSignalData = ref({ snr: [], rssi: [] });

// Chart refs
const positionChart = ref(null);
const positionSignalChart = ref(null);
const positionFrequencyChart = ref(null);

const batteryChart = ref(null);
const voltageChart = ref(null);
const temperatureChart = ref(null);
const humidityChart = ref(null);
const pressureChart = ref(null);
const channelChart = ref(null);
const telemetrySignalChart = ref(null);
const telemetryFrequencyChart = ref(null);

const nodeinfoSignalChart = ref(null);
const nodeinfoFrequencyChart = ref(null);

const messagesSignalChart = ref(null);

const chartInstances = [];

// Collapse/expand state for each block
const isPositionBlockExpanded = ref(false);
const isTelemetryBlockExpanded = ref(false);
const isNodeinfoBlockExpanded = ref(false);
const isMessagesBlockExpanded = ref(false);

// Computed property to check if there's any telemetry data
const hasTelemetryData = computed(() => {
  return (
    telemetryData.value.battery.length > 0 ||
    telemetryData.value.voltage.length > 0 ||
    telemetryData.value.temperature.length > 0 ||
    telemetryData.value.humidity.length > 0 ||
    telemetryData.value.pressure.length > 0 ||
    telemetryData.value.channelUtilization.length > 0
  );
});

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

// Calculate messages per hour
const calculateMessagesPerHour = (data) => {
  if (!data || data.length === 0) return [];

  // Group messages by hour
  const hourlyCount = {};

  data.forEach((item) => {
    if (item.timestamp) {
      const date = new Date(item.timestamp);
      // Round to hour
      const hourKey = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        0,
        0,
        0
      ).getTime();

      if (!hourlyCount[hourKey]) {
        hourlyCount[hourKey] = 0;
      }
      hourlyCount[hourKey]++;
    }
  });

  // Convert to array format for chart
  return Object.keys(hourlyCount)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((key) => ({
      timestamp: parseInt(key),
      value: hourlyCount[key],
    }));
};

const fetchAllData = async () => {
  try {
    loading.value = true;
    error.value = null;

    // Fetch Position Data
    try {
      const positionInfo = await meshtasticApi.getPositionInfo(props.nodeId);
      if (positionInfo?.data?.length > 0) {
        const positions = [];
        const posSnr = [];
        const posRssi = [];
        const posHopLimit = [];

        positionInfo.data.forEach((d) => {
          if (d.rawData?.latitude_i && d.rawData?.longitude_i) {
            positions.push({
              timestamp: d.timestamp,
              latitude: d.rawData.latitude_i / 1e7,
              longitude: d.rawData.longitude_i / 1e7,
              altitude: d.rawData.altitude,
              sats: d.rawData.sats_in_view,
            });
          }

          // Collect SNR/RSSI/hopLimit from position packets
          if (d.rxSnr !== undefined && d.rxSnr !== 0) {
            posSnr.push({
              timestamp: d.timestamp,
              value: d.rxSnr,
              gateway: d.gatewayId || d.gateway || "Unknown",
            });
          }
          if (d.rxRssi !== undefined && d.rxRssi !== 0) {
            posRssi.push({
              timestamp: d.timestamp,
              value: d.rxRssi,
              gateway: d.gatewayId || d.gateway || "Unknown",
            });
          }
          if (d.hopLimit !== undefined) {
            posHopLimit.push({
              timestamp: d.timestamp,
              value: d.hopLimit,
              gateway: d.gatewayId || d.gateway || "Unknown",
            });
          }
        });

        // Calculate messages per hour
        const messagesPerHour = calculateMessagesPerHour(positionInfo.data);

        positionData.value = positions.reverse();
        positionSignalData.value = {
          snr: posSnr.reverse(),
          rssi: posRssi.reverse(),
        };
        positionHopLimitData.value = posHopLimit.reverse();
        positionMessagesPerHour.value = messagesPerHour;
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
        const telSnr = [];
        const telRssi = [];
        const telHopLimit = [];

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

          // Collect SNR/RSSI/hopLimit from telemetry packets
          if (entry.rxSnr !== undefined && entry.rxSnr !== 0) {
            telSnr.push({
              timestamp: entry.timestamp,
              value: entry.rxSnr,
              gateway: entry.gatewayId || entry.gateway || "Unknown",
            });
          }
          if (entry.rxRssi !== undefined && entry.rxRssi !== 0) {
            telRssi.push({
              timestamp: entry.timestamp,
              value: entry.rxRssi,
              gateway: entry.gatewayId || entry.gateway || "Unknown",
            });
          }
          if (entry.hopLimit !== undefined) {
            telHopLimit.push({
              timestamp: entry.timestamp,
              value: entry.hopLimit,
              gateway: entry.gatewayId || entry.gateway || "Unknown",
            });
          }
        });

        // Calculate messages per hour for telemetry
        const telemetryMsgPerHour = calculateMessagesPerHour(
          telemetryInfo.data
        );

        telemetryData.value = {
          battery: battery.reverse(),
          voltage: voltage.reverse(),
          temperature: temperature.reverse(),
          humidity: humidity.reverse(),
          pressure: pressure.reverse(),
          channelUtilization: channelUtilization.reverse(),
          airUtilTx: airUtilTx.reverse(),
        };
        telemetrySignalData.value = {
          snr: telSnr.reverse(),
          rssi: telRssi.reverse(),
          hopLimit: telHopLimit.reverse(),
        };
        telemetryMessagesPerHour.value = telemetryMsgPerHour;
      }
    } catch (e) {
      console.warn("Telemetry data error:", e);
    }

    // Fetch NodeInfo Signal Data
    try {
      const snrData = [];
      const rssiData = [];
      const hopLimitData = [];

      const nodeInfo = await meshtasticApi.getNodeInfo(props.nodeId);
      if (nodeInfo?.data?.length > 0) {
        nodeInfo.data.forEach((entry) => {
          if (entry.rxSnr !== undefined && entry.rxSnr !== 0) {
            snrData.push({
              timestamp: entry.timestamp,
              value: entry.rxSnr,
              gateway: entry.gatewayId || entry.gateway || "Unknown",
            });
          }
          if (entry.rxRssi !== undefined && entry.rxRssi !== 0) {
            rssiData.push({
              timestamp: entry.timestamp,
              value: entry.rxRssi,
              gateway: entry.gatewayId || entry.gateway || "Unknown",
            });
          }
          if (entry.hopLimit !== undefined) {
            hopLimitData.push({
              timestamp: entry.timestamp,
              value: entry.hopLimit,
              gateway: entry.gatewayId || entry.gateway || "Unknown",
            });
          }
        });
      }

      // Calculate messages per hour for nodeinfo
      const nodeinfoMsgPerHour = calculateMessagesPerHour(nodeInfo.data);

      nodeinfoSignalData.value = {
        snr: snrData.reverse(),
        rssi: rssiData.reverse(),
        hopLimit: hopLimitData.reverse(),
      };
      nodeinfoMessagesPerHour.value = nodeinfoMsgPerHour;
    } catch (e) {
      console.warn("NodeInfo signal data error:", e);
    }

    // Fetch Text Messages
    try {
      const textMessages = await meshtasticApi.getTextMessages(props.nodeId);
      if (textMessages?.data?.length > 0) {
        const messages = [];
        const msgSnr = [];
        const msgRssi = [];

        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

        textMessages.data.forEach((m) => {
          // Check if message is public (to: "^all" or 0xffffffff or 4294967295)
          const isPublic =
            m.to === "^all" ||
            m.to === 0xffffffff ||
            m.to === 4294967295 ||
            m.to === "ffffffff";

          // Check if message is not older than 1 week
          const isRecent = m.timestamp && m.timestamp >= oneWeekAgo;

          if (m.rawData?.text && isPublic && isRecent) {
            messages.push({
              timestamp: m.timestamp,
              text: m.rawData.text,
              to: m.to,
            });
          }

          // Collect SNR/RSSI from message packets (only for public and recent messages)
          if (isPublic && isRecent) {
            if (m.rxSnr !== undefined && m.rxSnr !== 0) {
              msgSnr.push({ timestamp: m.timestamp, value: m.rxSnr });
            }
            if (m.rxRssi !== undefined && m.rxRssi !== 0) {
              msgRssi.push({ timestamp: m.timestamp, value: m.rxRssi });
            }
          }
        });

        messagesData.value = messages.reverse();
        messagesSignalData.value = {
          snr: msgSnr.reverse(),
          rssi: msgRssi.reverse(),
        };
      }
    } catch (e) {
      console.warn("Messages data error:", e);
    }

    // Check if we have any data
    hasData.value =
      positionMessagesPerHour.value.length > 0 ||
      positionSignalData.value.snr.length > 0 ||
      positionSignalData.value.rssi.length > 0 ||
      positionHopLimitData.value.length > 0 ||
      telemetryMessagesPerHour.value.length > 0 ||
      telemetryData.value.battery.length > 0 ||
      telemetryData.value.voltage.length > 0 ||
      telemetryData.value.temperature.length > 0 ||
      telemetryData.value.humidity.length > 0 ||
      telemetryData.value.pressure.length > 0 ||
      telemetryData.value.channelUtilization.length > 0 ||
      telemetrySignalData.value.snr.length > 0 ||
      telemetrySignalData.value.rssi.length > 0 ||
      telemetrySignalData.value.hopLimit.length > 0 ||
      nodeinfoMessagesPerHour.value.length > 0 ||
      nodeinfoSignalData.value.snr.length > 0 ||
      nodeinfoSignalData.value.rssi.length > 0 ||
      nodeinfoSignalData.value.hopLimit.length > 0 ||
      messagesData.value.length > 0 ||
      messagesSignalData.value.snr.length > 0 ||
      messagesSignalData.value.rssi.length > 0;
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
            afterLabel: (context) => {
              const dataIndex = context.dataIndex;
              const dataPoint = data[dataIndex];
              if (dataPoint?.gateway) {
                return `Шлюз: ${dataPoint.gateway}`;
              }
              return "";
            },
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

const createTripleAxisChart = (
  canvasRef,
  label1,
  data1,
  color1,
  label2,
  data2,
  color2,
  label3,
  data3,
  color3
) => {
  if (!canvasRef || (!data1.length && !data2.length && !data3.length)) return;

  const ctx = canvasRef.getContext("2d");

  // Combine timestamps
  const allTimestamps = [
    ...new Set([
      ...data1.map((d) => d.timestamp),
      ...data2.map((d) => d.timestamp),
      ...data3.map((d) => d.timestamp),
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
        {
          label: label3,
          data: allTimestamps.map((ts) => {
            const point = data3.find((d) => d.timestamp === ts);
            return point ? point.value : null;
          }),
          borderColor: color3,
          backgroundColor: color3 + "20",
          borderWidth: 2,
          tension: 0.4,
          yAxisID: "y2",
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
        },
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              const dataIndex = context.dataIndex;
              const ts = allTimestamps[dataIndex];
              let dataSource = null;

              if (context.datasetIndex === 0 && data1.length) {
                dataSource = data1.find((d) => d.timestamp === ts);
              } else if (context.datasetIndex === 1 && data2.length) {
                dataSource = data2.find((d) => d.timestamp === ts);
              } else if (context.datasetIndex === 2 && data3.length) {
                dataSource = data3.find((d) => d.timestamp === ts);
              }

              if (dataSource?.gateway) {
                return `Шлюз: ${dataSource.gateway}`;
              }
              return "";
            },
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
        y2: {
          type: "linear",
          display: true,
          position: "right",
          title: {
            display: true,
            text: label3,
          },
          grid: {
            drawOnChartArea: false,
          },
          offset: true,
        },
      },
    },
  });

  chartInstances.push(chartInstance);
};

const renderCharts = async () => {
  await nextTick();

  // Position Messages Per Hour Chart
  if (
    positionMessagesPerHour.value.length > 0 &&
    positionFrequencyChart.value
  ) {
    createChart(
      positionFrequencyChart.value,
      "Сообщений в час",
      positionMessagesPerHour.value,
      "#8b5cf6",
      " шт"
    );
  }

  // Position Signal Quality Chart (SNR + RSSI + hopLimit)
  if (
    (positionSignalData.value.snr.length > 0 ||
      positionSignalData.value.rssi.length > 0 ||
      positionHopLimitData.value.length > 0) &&
    positionSignalChart.value
  ) {
    createTripleAxisChart(
      positionSignalChart.value,
      "SNR (dB)",
      positionSignalData.value.snr,
      "#10b981",
      "RSSI (dBm)",
      positionSignalData.value.rssi,
      "#ef4444",
      "Hop Limit",
      positionHopLimitData.value,
      "#f59e0b"
    );
  }

  // Telemetry Messages Per Hour Chart
  if (
    telemetryMessagesPerHour.value.length > 0 &&
    telemetryFrequencyChart.value
  ) {
    createChart(
      telemetryFrequencyChart.value,
      "Сообщений в час",
      telemetryMessagesPerHour.value,
      "#8b5cf6",
      " шт"
    );
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

  // Telemetry Signal Quality Chart (SNR + RSSI + hopLimit)
  if (
    (telemetrySignalData.value.snr.length > 0 ||
      telemetrySignalData.value.rssi.length > 0 ||
      telemetrySignalData.value.hopLimit.length > 0) &&
    telemetrySignalChart.value
  ) {
    createTripleAxisChart(
      telemetrySignalChart.value,
      "SNR (dB)",
      telemetrySignalData.value.snr,
      "#10b981",
      "RSSI (dBm)",
      telemetrySignalData.value.rssi,
      "#ef4444",
      "Hop Limit",
      telemetrySignalData.value.hopLimit,
      "#f59e0b"
    );
  }

  // NodeInfo Messages Per Hour Chart
  if (
    nodeinfoMessagesPerHour.value.length > 0 &&
    nodeinfoFrequencyChart.value
  ) {
    createChart(
      nodeinfoFrequencyChart.value,
      "Сообщений в час",
      nodeinfoMessagesPerHour.value,
      "#8b5cf6",
      " шт"
    );
  }

  // NodeInfo Signal Quality Chart (SNR + RSSI + hopLimit)
  if (
    (nodeinfoSignalData.value.snr.length > 0 ||
      nodeinfoSignalData.value.rssi.length > 0 ||
      nodeinfoSignalData.value.hopLimit.length > 0) &&
    nodeinfoSignalChart.value
  ) {
    createTripleAxisChart(
      nodeinfoSignalChart.value,
      "SNR (dB)",
      nodeinfoSignalData.value.snr,
      "#10b981",
      "RSSI (dBm)",
      nodeinfoSignalData.value.rssi,
      "#ef4444",
      "Hop Limit",
      nodeinfoSignalData.value.hopLimit,
      "#f59e0b"
    );
  }
};

onMounted(async () => {
  await fetchAllData();
  if (hasData.value) {
    await renderCharts();
  }
});

// Watch for block expansion to re-render charts
watch(isPositionBlockExpanded, async (newVal) => {
  if (newVal && hasData.value) {
    await nextTick();
    // Re-render position charts
    if (
      positionMessagesPerHour.value.length > 0 &&
      positionFrequencyChart.value
    ) {
      createChart(
        positionFrequencyChart.value,
        "Сообщений в час",
        positionMessagesPerHour.value,
        "#8b5cf6",
        " шт"
      );
    }
    if (
      (positionSignalData.value.snr.length > 0 ||
        positionSignalData.value.rssi.length > 0 ||
        positionHopLimitData.value.length > 0) &&
      positionSignalChart.value
    ) {
      createTripleAxisChart(
        positionSignalChart.value,
        "SNR (dB)",
        positionSignalData.value.snr,
        "#10b981",
        "RSSI (dBm)",
        positionSignalData.value.rssi,
        "#ef4444",
        "Hop Limit",
        positionHopLimitData.value,
        "#f59e0b"
      );
    }
  }
});

watch(isTelemetryBlockExpanded, async (newVal) => {
  if (newVal && hasData.value) {
    await nextTick();
    // Re-render telemetry charts
    if (
      telemetryMessagesPerHour.value.length > 0 &&
      telemetryFrequencyChart.value
    ) {
      createChart(
        telemetryFrequencyChart.value,
        "Сообщений в час",
        telemetryMessagesPerHour.value,
        "#8b5cf6",
        " шт"
      );
    }
    if (telemetryData.value.battery.length > 0 && batteryChart.value) {
      createChart(
        batteryChart.value,
        "Батарея",
        telemetryData.value.battery,
        "#10b981",
        "%"
      );
    }
    if (telemetryData.value.voltage.length > 0 && voltageChart.value) {
      createChart(
        voltageChart.value,
        "Напряжение",
        telemetryData.value.voltage,
        "#f59e0b",
        " В"
      );
    }
    if (telemetryData.value.temperature.length > 0 && temperatureChart.value) {
      createChart(
        temperatureChart.value,
        "Температура",
        telemetryData.value.temperature,
        "#ef4444",
        "°C"
      );
    }
    if (telemetryData.value.humidity.length > 0 && humidityChart.value) {
      createChart(
        humidityChart.value,
        "Влажность",
        telemetryData.value.humidity,
        "#06b6d4",
        "%"
      );
    }
    if (telemetryData.value.pressure.length > 0 && pressureChart.value) {
      createChart(
        pressureChart.value,
        "Давление",
        telemetryData.value.pressure,
        "#8b5cf6",
        " hPa"
      );
    }
    if (
      telemetryData.value.channelUtilization.length > 0 &&
      channelChart.value
    ) {
      createChart(
        channelChart.value,
        "Загрузка канала",
        telemetryData.value.channelUtilization,
        "#ec4899",
        "%"
      );
    }
    if (
      (telemetrySignalData.value.snr.length > 0 ||
        telemetrySignalData.value.rssi.length > 0 ||
        telemetrySignalData.value.hopLimit.length > 0) &&
      telemetrySignalChart.value
    ) {
      createTripleAxisChart(
        telemetrySignalChart.value,
        "SNR (dB)",
        telemetrySignalData.value.snr,
        "#10b981",
        "RSSI (dBm)",
        telemetrySignalData.value.rssi,
        "#ef4444",
        "Hop Limit",
        telemetrySignalData.value.hopLimit,
        "#f59e0b"
      );
    }
  }
});

watch(isNodeinfoBlockExpanded, async (newVal) => {
  if (newVal && hasData.value) {
    await nextTick();
    // Re-render nodeinfo charts
    if (
      nodeinfoMessagesPerHour.value.length > 0 &&
      nodeinfoFrequencyChart.value
    ) {
      createChart(
        nodeinfoFrequencyChart.value,
        "Сообщений в час",
        nodeinfoMessagesPerHour.value,
        "#8b5cf6",
        " шт"
      );
    }
    if (
      (nodeinfoSignalData.value.snr.length > 0 ||
        nodeinfoSignalData.value.rssi.length > 0 ||
        nodeinfoSignalData.value.hopLimit.length > 0) &&
      nodeinfoSignalChart.value
    ) {
      createTripleAxisChart(
        nodeinfoSignalChart.value,
        "SNR (dB)",
        nodeinfoSignalData.value.snr,
        "#10b981",
        "RSSI (dBm)",
        nodeinfoSignalData.value.rssi,
        "#ef4444",
        "Hop Limit",
        nodeinfoSignalData.value.hopLimit,
        "#f59e0b"
      );
    }
  }
});

watch(isMessagesBlockExpanded, async (newVal) => {
  if (newVal && hasData.value) {
    await nextTick();
    // Re-render messages charts
    if (
      (messagesSignalData.value.snr.length > 0 ||
        messagesSignalData.value.rssi.length > 0) &&
      messagesSignalChart.value
    ) {
      createDualAxisChart(
        messagesSignalChart.value,
        "SNR (dB)",
        messagesSignalData.value.snr,
        "#10b981",
        "RSSI (dBm)",
        messagesSignalData.value.rssi,
        "#ef4444"
      );
    }
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
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.endpoint-block {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.endpoint-header {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  padding: 20px 24px;
  border-bottom: 2px solid #d1d5db;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s;
}

.endpoint-header:hover {
  opacity: 0.95;
}

.endpoint-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.endpoint-header h2 {
  margin: 0 0 8px 0;
  color: #111827;
  font-size: 1.4rem;
  font-weight: 700;
  font-family: "Courier New", monospace;
}

.collapse-button {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #6b7280;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-button:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #374151;
}

.endpoint-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.95rem;
  font-weight: 500;
}

.endpoint-charts {
  padding: 24px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Цветовые акценты для разных блоков */
.position-block .endpoint-header {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.position-block {
  border-color: #93c5fd;
}

.telemetry-block .endpoint-header {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
}

.telemetry-block {
  border-color: #6ee7b7;
}

.nodeinfo-block .endpoint-header {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.nodeinfo-block {
  border-color: #fcd34d;
}

.messages-block .endpoint-header {
  background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
}

.messages-block {
  border-color: #f9a8d4;
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

  .charts-container {
    gap: 24px;
  }

  .endpoint-header {
    padding: 16px;
  }

  .endpoint-header h2 {
    font-size: 1.2rem;
  }

  .endpoint-description {
    font-size: 0.85rem;
  }

  .endpoint-charts {
    padding: 16px;
    gap: 16px;
  }

  .chart-section {
    padding: 16px;
  }
}
</style>
