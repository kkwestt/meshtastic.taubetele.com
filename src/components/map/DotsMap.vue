<template>
  <div id="map" class="w-full h-full" @click="handleMapClick">
    <div class="node-counter">
      <span v-if="Object.keys(devices).length === 0"
        >🔄 Загрузка данных...</span
      >
      <span v-else>
        Узлов: {{ Object.keys(devices).length }} | Видимых: {{ pointsOnMap }}
      </span>
      <div class="update-indicator" v-if="updateInterval">
        <span class="update-dot"></span>
        <span class="update-text">Автообновление</span>
      </div>
    </div>

    <!-- Геолокация статус -->
    <div class="geolocation-status" v-if="geolocationStatus">
      <span :class="geolocationStatus.type">{{
        geolocationStatus.message
      }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import {
  MAP_CONFIG,
  MAP_PRESETS,
  UI_CONFIG,
  HARDWARE_MODELS,
  DEVICE_ROLES,
  REGIONS,
} from "../../utils/constants.js";
import { debounce, isPointInBounds } from "../../utils/helpers.js";
import { meshtasticApi } from "../../utils/api.js";

const emit = defineEmits(["infoOpen", "devicesCount"]);

let map, openedNodeId;

const handleMapClick = (event) => {
  const { nodeId } = event.target.dataset;
  if (nodeId) {
    // Обработка клика по узлу
  }
};

const devices = ref({});
const pointsOnMap = ref(0);
const filteredDevicesCache = ref(new Map());
const geolocationStatus = ref(null);

const clearGeolocationStatus = () => {
  setTimeout(() => {
    if (geolocationStatus.value?.type === "success") {
      geolocationStatus.value = null;
    }
  }, 5000); // Очищаем успешный статус через 5 секунд
};

const filterDevicesByBounds = (devices, bounds) => {
  if (!bounds || !devices) return [];

  const cacheKey = `${bounds.getSouthWest()}-${bounds.getNorthEast()}`;

  if (filteredDevicesCache.value.has(cacheKey)) {
    return filteredDevicesCache.value.get(cacheKey);
  }

  const filtered = [];
  const now = Date.now();

  for (const index in devices) {
    const device = devices[index];

    if (!device.latitude || !device.longitude) continue;

    const deviceTime = device.s_time;
    const timeDiffHours = (now - deviceTime) / (1000 * 60 * 60);
    if (timeDiffHours > 24) continue;

    if (!isPointInBounds(device.latitude, device.longitude, bounds)) continue;

    filtered.push(device);
  }

  filteredDevicesCache.value.set(cacheKey, filtered);

  if (filteredDevicesCache.value.size > 10) {
    const firstKey = filteredDevicesCache.value.keys().next().value;
    filteredDevicesCache.value.delete(firstKey);
  }

  return filtered;
};

const debouncedRenderBallons = debounce((devices, isUpdate) => {
  renderBallons(devices, isUpdate);
}, 2000);

const formatTime = (timestamp) => {
  if (!timestamp || timestamp === "undefined" || timestamp === 0) {
    return "Неизвестно";
  }

  const numTimestamp = Number(timestamp);
  if (isNaN(numTimestamp)) {
    return "Неизвестно";
  }

  let date;
  if (Math.abs(numTimestamp) > 10000) {
    date = new Date(numTimestamp);
  } else {
    date = new Date(numTimestamp * 1000);
  }

  if (isNaN(date.getTime())) {
    return "Неизвестно";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return `${diffSeconds} сек назад`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes} мин назад`;
  } else if (diffHours < 24) {
    return `${diffHours} ч назад`;
  } else if (diffDays < 7) {
    return `${diffDays} дн назад`;
  } else {
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
};

const createBalloonContent = async (device, nodeId) => {
  let nodeInfoHtml = "";
  let positionInfoHtml = "";
  let telemetryInfoHtml = "";
  let textMessagesHtml = "";
  let mapReportHtml = "";
  let tracerouteHtml = "";

  try {
    const nodeInfo = await meshtasticApi.getNodeInfo(nodeId);
    if (nodeInfo && nodeInfo.data && nodeInfo.data.length > 0) {
      // Берем последнюю запись (самую свежую)
      const latestInfo = nodeInfo.data[0];
      const rawData = latestInfo.rawData;

      if (rawData) {
        nodeInfoHtml = `
    ${
      device.mqtt === "1"
        ? '<div style="font-weight: bold; color: #2E7D32; margin-bottom: 4px;">MQTT Шлюз</div>'
        : ""
    }
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
    <div style="font-weight: bold;">Информация об узле: ${formatTime(
      latestInfo.timestamp
    )}</div>
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 11px; line-height: 1.2;">
    ${
      rawData.is_unmessagable
        ? `<span>Принимает сообщения:</span><span>${
            !rawData.is_unmessagable ? "Да" : "Нет"
          }</span>`
        : ""
    }
    ${
      rawData.id
        ? `<span>ID:</span><span>${rawData.id} (${nodeId}) </span>`
        : ""
    }
    ${
      rawData.hw_model
        ? `<span>Модель:</span><span>${
            HARDWARE_MODELS[rawData.hw_model]
          }</span>`
        : ""
    }
    </div>
    </div>
    `;

        // Формируем компактную строку с метриками для информации об узле
        const nodeMetrics = [];
        if (latestInfo.rxSnr !== undefined && latestInfo.rxRssi !== undefined) {
          if (latestInfo.rxSnr === 0 && latestInfo.rxRssi === 0) {
            // Данные через MQTT - показываем в одной строке с Gateway
            const mqttLine = `Данные: Через MQTT${
              latestInfo.gatewayId ? ` | Gateway: ${latestInfo.gatewayId}` : ""
            }`;
            nodeInfoHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${mqttLine}</div>
    </div>
    `;
          } else {
            // Обычные данные - показываем метрики и Gateway на новой строке
            if (latestInfo.rxSnr !== undefined)
              nodeMetrics.push(`SNR: ${latestInfo.rxSnr} dB`);
            if (latestInfo.rxRssi !== undefined)
              nodeMetrics.push(`RSSI: ${latestInfo.rxRssi} dBm`);
            if (latestInfo.hopLimit !== undefined) {
              const hops =
                7 - latestInfo.hopLimit === 0
                  ? "Direct"
                  : 7 - latestInfo.hopLimit;
              nodeMetrics.push(`Hops: ${hops}`);
            }

            if (nodeMetrics.length > 0) {
              nodeInfoHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${nodeMetrics.join(" | ")}</div>
    ${
      latestInfo.gatewayId
        ? `<div style="margin-top: 1px;">Gateway: ${latestInfo.gatewayId}</div>`
        : ""
    }
    </div>
    `;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Ошибка загрузки информации об узле:", error);
  }

  try {
    const positionInfo = await meshtasticApi.getPositionInfo(nodeId);
    if (positionInfo && positionInfo.data && positionInfo.data.length > 0) {
      // Берем последнюю запись (самую свежую)
      const latestPosition = positionInfo.data[0];

      positionInfoHtml = `
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
    <div style="font-weight: bold; margin-bottom: 2px;">Данные о позиции: ${formatTime(
      latestPosition.timestamp
    )}</div>

    <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 11px; line-height: 1.2;">
    ${
      latestPosition.rawData.latitude_i !== undefined
        ? `<span>Координаты:</span><span>${(
            latestPosition.rawData.latitude_i / 10000
          ).toFixed(4)}, ${(latestPosition.rawData.longitude_i / 10000).toFixed(
            4
          )}${
            latestPosition.rawData.altitude !== undefined
              ? `, ${latestPosition.rawData.altitude}м`
              : ""
          }${
            latestPosition.rawData.sats_in_view !== undefined
              ? `, ${latestPosition.rawData.sats_in_view}Sat`
              : ""
          }</span>`
        : ""
    }
    </div>
    </div>
    `;

      // Формируем компактную строку с метриками для данных о позиции
      if (
        latestPosition.rxSnr !== undefined &&
        latestPosition.rxRssi !== undefined
      ) {
        if (latestPosition.rxSnr === 0 && latestPosition.rxRssi === 0) {
          // Данные через MQTT - показываем в одной строке с Gateway
          const mqttLine = `Данные: Через MQTT${
            latestPosition.gatewayId
              ? ` | Gateway: ${latestPosition.gatewayId}`
              : ""
          }`;
          positionInfoHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${mqttLine}</div>
    </div>
    `;
        } else {
          // Обычные данные - показываем метрики и Gateway на новой строке
          const positionMetrics = [];
          if (latestPosition.rxSnr !== undefined)
            positionMetrics.push(`SNR: ${latestPosition.rxSnr} dB`);
          if (latestPosition.rxRssi !== undefined)
            positionMetrics.push(`RSSI: ${latestPosition.rxRssi} dBm`);
          if (latestPosition.hopLimit !== undefined) {
            const hops =
              7 - latestPosition.hopLimit === 0
                ? "Direct"
                : 7 - latestPosition.hopLimit;
            positionMetrics.push(`Hops: ${hops}`);
          }

          if (positionMetrics.length > 0) {
            positionInfoHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${positionMetrics.join(" | ")}</div>
    ${
      latestPosition.gatewayId
        ? `<div style="margin-top: 1px;">Gateway: ${latestPosition.gatewayId}</div>`
        : ""
    }
    </div>
    `;
          }
        }
      }
    }
  } catch (error) {
    console.error("Ошибка загрузки информации о позиции:", error);
  }

  try {
    const telemetryInfo = await meshtasticApi.getTelemetryInfo(nodeId);
    if (telemetryInfo && telemetryInfo.data && telemetryInfo.data.length > 0) {
      // Разделяем данные по типам
      let deviceMetricsData = null;
      let environmentMetricsData = null;
      let latestDeviceMetrics = null;
      let latestEnvironmentMetrics = null;

      // Ищем последние данные каждого типа
      for (const entry of telemetryInfo.data) {
        if (
          entry.rawData &&
          entry.rawData.type === "deviceMetrics" &&
          !latestDeviceMetrics
        ) {
          latestDeviceMetrics = entry;
          deviceMetricsData =
            entry.rawData.variant && entry.rawData.variant.value
              ? entry.rawData.variant.value
              : null;
        }
        if (
          entry.rawData &&
          entry.rawData.type === "environmentMetrics" &&
          !latestEnvironmentMetrics
        ) {
          latestEnvironmentMetrics = entry;
          environmentMetricsData =
            entry.rawData.variant && entry.rawData.variant.value
              ? entry.rawData.variant.value
              : null;
        }
      }

      // Формируем HTML для данных узла (deviceMetrics)
      let deviceMetricsHtml = "";
      if (latestDeviceMetrics && deviceMetricsData) {
        deviceMetricsHtml = `
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
    <div style="font-weight: bold; margin-bottom: 2px;">Телеметрия узла: ${formatTime(
      latestDeviceMetrics.timestamp
    )}</div>

    <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 11px; line-height: 1.2;">
    ${
      deviceMetricsData.battery_level !== undefined
        ? `<span>Батарея:</span><span>${Math.min(
            deviceMetricsData.battery_level,
            100
          )}%</span>`
        : ""
    }
    ${
      deviceMetricsData.voltage !== undefined
        ? `<span>Напряжение:</span><span>${deviceMetricsData.voltage.toFixed(
            2
          )} В</span>`
        : ""
    }
    ${
      deviceMetricsData.channel_utilization !== undefined
        ? `<span>Загрузка канала:</span><span>${deviceMetricsData.channel_utilization.toFixed(
            1
          )}%</span>`
        : ""
    }
    ${
      deviceMetricsData.air_util_tx !== undefined
        ? `<span>Эфир TX:</span><span>${deviceMetricsData.air_util_tx.toFixed(
            1
          )}%</span>`
        : ""
    }
    ${
      deviceMetricsData.uptime_seconds !== undefined
        ? `<span>Время работы:</span><span>${Math.floor(
            deviceMetricsData.uptime_seconds / 3600
          )}ч ${Math.floor(
            (deviceMetricsData.uptime_seconds % 3600) / 60
          )}м</span>`
        : ""
    }
    </div>
    </div>
    `;

        // Формируем компактную строку с метриками для телеметрии узла
        if (
          latestDeviceMetrics.rxSnr !== undefined &&
          latestDeviceMetrics.rxRssi !== undefined
        ) {
          if (
            latestDeviceMetrics.rxSnr === 0 &&
            latestDeviceMetrics.rxRssi === 0
          ) {
            // Данные через MQTT - показываем в одной строке с Gateway
            const mqttLine = `Данные: Через MQTT${
              latestDeviceMetrics.gatewayId
                ? ` | Gateway: ${latestDeviceMetrics.gatewayId}`
                : ""
            }`;
            deviceMetricsHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${mqttLine}</div>
    </div>
    `;
          } else {
            // Обычные данные - показываем метрики и Gateway на новой строке
            const deviceMetrics = [];
            if (latestDeviceMetrics.rxSnr !== undefined)
              deviceMetrics.push(`SNR: ${latestDeviceMetrics.rxSnr} dB`);
            if (latestDeviceMetrics.rxRssi !== undefined)
              deviceMetrics.push(`RSSI: ${latestDeviceMetrics.rxRssi} dBm`);
            if (latestDeviceMetrics.hopLimit !== undefined) {
              const hops =
                7 - latestDeviceMetrics.hopLimit === 0
                  ? "Direct"
                  : 7 - latestDeviceMetrics.hopLimit;
              deviceMetrics.push(`Hops: ${hops}`);
            }

            if (deviceMetrics.length > 0) {
              deviceMetricsHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${deviceMetrics.join(" | ")}</div>
    ${
      latestDeviceMetrics.gatewayId
        ? `<div style="margin-top: 1px;">Gateway: ${latestDeviceMetrics.gatewayId}</div>`
        : ""
    }
    </div>
    `;
            }
          }
        }
      }

      // Формируем HTML для сенсоров (environmentMetrics)
      let environmentMetricsHtml = "";
      if (latestEnvironmentMetrics && environmentMetricsData) {
        environmentMetricsHtml = `
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
    <div style="font-weight: bold; margin-bottom: 2px;">Сенсоры: ${formatTime(
      latestEnvironmentMetrics.timestamp
    )}</div>

    <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 11px; line-height: 1.2;">
    ${
      environmentMetricsData.temperature !== undefined
        ? `<span>Температура:</span><span>${environmentMetricsData.temperature.toFixed(
            1
          )}°C</span>`
        : ""
    }
    ${
      environmentMetricsData.lux !== undefined
        ? `<span>Освещенность:</span><span>${environmentMetricsData.lux} lux</span>`
        : ""
    }
    ${
      environmentMetricsData.humidity !== undefined
        ? `<span>Влажность:</span><span>${environmentMetricsData.humidity.toFixed(
            1
          )}%</span>`
        : ""
    }
    ${
      environmentMetricsData.pressure !== undefined
        ? `<span>Давление:</span><span>${environmentMetricsData.pressure.toFixed(
            1
          )} hPa</span>`
        : ""
    }
    </div>
    </div>
    `;

        // Формируем компактную строку с метриками для сенсоров
        if (
          latestEnvironmentMetrics.rxSnr !== undefined &&
          latestEnvironmentMetrics.rxRssi !== undefined
        ) {
          if (
            latestEnvironmentMetrics.rxSnr === 0 &&
            latestEnvironmentMetrics.rxRssi === 0
          ) {
            // Данные через MQTT - показываем в одной строке с Gateway
            const mqttLine = `Данные: Через MQTT${
              latestEnvironmentMetrics.gatewayId
                ? ` | Gateway: ${latestEnvironmentMetrics.gatewayId}`
                : ""
            }`;
            environmentMetricsHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${mqttLine}</div>
    </div>
    `;
          } else {
            // Обычные данные - показываем метрики и Gateway на новой строке
            const envMetrics = [];
            if (latestEnvironmentMetrics.rxSnr !== undefined)
              envMetrics.push(`SNR: ${latestEnvironmentMetrics.rxSnr} dB`);
            if (latestEnvironmentMetrics.rxRssi !== undefined)
              envMetrics.push(`RSSI: ${latestEnvironmentMetrics.rxRssi} dBm`);
            if (latestEnvironmentMetrics.hopLimit !== undefined) {
              const hops =
                7 - latestEnvironmentMetrics.hopLimit === 0
                  ? "Direct"
                  : 7 - latestEnvironmentMetrics.hopLimit;
              envMetrics.push(`Hops: ${hops}`);
            }

            if (envMetrics.length > 0) {
              environmentMetricsHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${envMetrics.join(" | ")}</div>
    ${
      latestEnvironmentMetrics.gatewayId
        ? `<div style="margin-top: 1px;">Gateway: ${latestEnvironmentMetrics.gatewayId}</div>`
        : ""
    }
    </div>
    `;
            }
          }
        }
      }

      telemetryInfoHtml = deviceMetricsHtml + environmentMetricsHtml;
    }
  } catch (error) {
    console.error("Ошибка загрузки телеметрии:", error);
  }

  try {
    const textMessages = await meshtasticApi.getTextMessages(nodeId);
    if (textMessages && textMessages.data && textMessages.data.length > 0) {
      // Берем последнее сообщение (самое свежее)
      const latestMessage = textMessages.data[0];
      const rawData = latestMessage.rawData;

      if (rawData && rawData.text) {
        textMessagesHtml = `
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
    <div style="font-weight: bold; margin-bottom: 2px;">Последнее сообщение: ${formatTime(
      latestMessage.timestamp
    )}</div>

    <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 11px; line-height: 1.2;">
    <span>Текст:</span><span style="word-break: break-word;">${
      rawData.text
    }</span>

    ${
      latestMessage.to !== undefined
        ? `<span>Кому:</span><span>${
            latestMessage.to === 4294967295 ? "Всем" : latestMessage.to
          }</span>`
        : ""
    }
    </div>
    </div>
    `;

        // Формируем компактную строку с метриками для текстового сообщения
        if (
          latestMessage.rxSnr !== undefined &&
          latestMessage.rxRssi !== undefined
        ) {
          if (latestMessage.rxSnr === 0 && latestMessage.rxRssi === 0) {
            // Данные через MQTT - показываем в одной строке с Gateway
            const mqttLine = `Данные: Через MQTT${
              latestMessage.gatewayId
                ? ` | Gateway: ${latestMessage.gatewayId}`
                : ""
            }`;
            textMessagesHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${mqttLine}</div>
    </div>
    `;
          } else {
            // Обычные данные - показываем метрики и Gateway на новой строке
            const messageMetrics = [];
            if (latestMessage.rxSnr !== undefined)
              messageMetrics.push(`SNR: ${latestMessage.rxSnr} dB`);
            if (latestMessage.rxRssi !== undefined)
              messageMetrics.push(`RSSI: ${latestMessage.rxRssi} dBm`);
            if (latestMessage.hopLimit !== undefined) {
              const hops =
                7 - latestMessage.hopLimit === 0
                  ? "Direct"
                  : 7 - latestMessage.hopLimit;
              messageMetrics.push(`Hops: ${hops}`);
            }

            if (messageMetrics.length > 0) {
              textMessagesHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${messageMetrics.join(" | ")}</div>
    ${
      latestMessage.gatewayId
        ? `<div style="margin-top: 1px;">Gateway: ${latestMessage.gatewayId}</div>`
        : ""
    }
    </div>
    `;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Ошибка загрузки текстовых сообщений:", error);
  }

  try {
    const mapReportInfo = await meshtasticApi.getMapReportInfo(nodeId);
    if (mapReportInfo && mapReportInfo.data && mapReportInfo.data.length > 0) {
      // Берем последний отчет (самый свежий)
      const latestReport = mapReportInfo.data[0];
      const rawData = latestReport.rawData;

      if (rawData) {
        mapReportHtml = `
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
    <div style="font-weight: bold; margin-bottom: 2px;">Отчет карты: ${formatTime(
      latestReport.timestamp
    )}</div>

    <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 11px; line-height: 1.2;">
    ${
      rawData.decoded.role !== undefined
        ? `<span>Роль:</span><span>${DEVICE_ROLES[rawData.decoded.role]}</span>`
        : ""
    }
    ${
      rawData.decoded.hw_model !== undefined
        ? `<span>Модель:</span><span>${
            HARDWARE_MODELS[rawData.decoded.hw_model]
          }</span>`
        : ""
    }
    ${
      rawData.decoded.firmware_version
        ? `<span>Прошивка:</span><span>${rawData.decoded.firmware_version}</span>`
        : ""
    }
    ${
      rawData.decoded.region !== undefined
        ? `<span>Регион:</span><span>${
            REGIONS[rawData.decoded.region] || rawData.decoded.region
          }</span>`
        : ""
    }
    ${
      rawData.decoded.modem_preset !== undefined
        ? `<span>Пресет модема:</span><span>${rawData.decoded.modem_preset}</span>`
        : ""
    }
    ${
      rawData.decoded.has_default_channel !== undefined
        ? `<span>Канал по умолчанию:</span><span>${
            rawData.decoded.has_default_channel ? "Да" : "Нет"
          }</span>`
        : ""
    }
    ${
      rawData.decoded.numOnlineLocalNodes !== undefined
        ? `<span>Рядом других устройств:</span><span>${rawData.decoded.numOnlineLocalNodes}</span>`
        : ""
    }
    </div>
    </div>
    `;

        // Формируем компактную строку с метриками для отчета карты
        if (
          latestReport.rxSnr !== undefined &&
          latestReport.rxRssi !== undefined
        ) {
          if (latestReport.rxSnr === 0 && latestReport.rxRssi === 0) {
            // Данные через MQTT - показываем в одной строке с Gateway
            const mqttLine = `Данные: Через MQTT${
              latestReport.gatewayId
                ? ` | Gateway: ${latestReport.gatewayId}`
                : ""
            }`;
            mapReportHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${mqttLine}</div>
    </div>
    `;
          } else {
            // Обычные данные - показываем метрики и Gateway на новой строке
            const reportMetrics = [];
            if (latestReport.rxSnr !== undefined)
              reportMetrics.push(`SNR: ${latestReport.rxSnr} dB`);
            if (latestReport.rxRssi !== undefined)
              reportMetrics.push(`RSSI: ${latestReport.rxRssi} dBm`);
            if (latestReport.hopLimit !== undefined)
              reportMetrics.push(`Hops: ${latestReport.hopLimit}`);

            if (reportMetrics.length > 0) {
              mapReportHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${reportMetrics.join(" | ")}</div>
    ${
      latestReport.gatewayId
        ? `<div style="margin-top: 1px;">Gateway: ${latestReport.gatewayId}</div>`
        : ""
    }
    </div>
    `;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Ошибка загрузки отчета карты:", error);
  }

  // Загружаем данные traceroute
  try {
    const tracerouteInfo = await meshtasticApi.getTracerouteInfo(nodeId);
    if (
      tracerouteInfo &&
      tracerouteInfo.data &&
      tracerouteInfo.data.length > 0
    ) {
      // Берем последнюю запись (самую свежую)
      const latestTrace = tracerouteInfo.data[0];
      const rawData = latestTrace.rawData;

      if (rawData) {
        // Формируем компактный маршрут с SNR
        let routeDisplay = "";

        if (rawData.route && rawData.route.length > 0) {
          // Создаем маршрут с SNR для каждого хопа
          const routeParts = [];

          // Добавляем источник
          routeParts.push(`!${latestTrace.from.toString(16)}`);

          // Добавляем промежуточные узлы с SNR
          for (let i = 0; i < rawData.route.length; i++) {
            const nodeHex = `!${rawData.route[i].toString(16)}`;
            const snr =
              rawData.snr_towards && rawData.snr_towards[i]
                ? `(${rawData.snr_towards[i]}dB)`
                : "";
            routeParts.push(`${nodeHex}${snr}`);
          }

          // Добавляем назначение
          routeParts.push(`!${latestTrace.to.toString(16)}`);

          routeDisplay = routeParts.join(" → ");
        }

        // Формируем обратный маршрут если есть
        let backRouteDisplay = "";
        if (rawData.route_back && rawData.route_back.length > 0) {
          const backParts = [];
          for (let i = 0; i < rawData.route_back.length; i++) {
            const nodeHex = `!${rawData.route_back[i].toString(16)}`;
            const snr =
              rawData.snr_back && rawData.snr_back[i]
                ? `(${rawData.snr_back[i]}dB)`
                : "";
            backParts.push(`${nodeHex}${snr}`);
          }
          backRouteDisplay = backParts.join(" → ");
        } else {
          backRouteDisplay = "нет маршрута";
        }

        // Формируем компактную строку с метриками
        const metrics = [];
        if (latestTrace.rxSnr !== undefined)
          metrics.push(`SNR: ${latestTrace.rxSnr} dB`);
        if (latestTrace.rxRssi !== undefined)
          metrics.push(`RSSI: ${latestTrace.rxRssi} dBm`);
        if (latestTrace.hopLimit !== undefined)
          metrics.push(`Hops: ${latestTrace.hopLimit}`);
        const metricsLine = metrics.join(" | ");

        tracerouteHtml = `
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
    <div style="font-weight: bold; margin-bottom: 2px;">Traceroute: ${formatTime(
      latestTrace.timestamp
    )}</div>
    <div style="font-size: 11px; line-height: 1.3;">
    ${
      routeDisplay
        ? `<div style="margin-bottom: 2px; word-break: break-all;">Маршрут туда: ${routeDisplay}</div>`
        : ""
    }
    ${
      backRouteDisplay !== "Нет маршрута"
        ? `<div style="margin-bottom: 2px;">Обратно: ${backRouteDisplay}</div>`
        : ""
    }
    ${
      metricsLine
        ? `<div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">${metricsLine}</div>`
        : ""
    }
    ${
      latestTrace.gatewayId
        ? `<div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">Gateway: ${latestTrace.gatewayId}</div>`
        : ""
    }
    </div>
    </div>
    `;
      }
    }
  } catch (error) {
    console.error("Ошибка загрузки данных traceroute:", error);
  }

  return `
    <div style="max-width: 350px; font-size: 12px;">

    ${nodeInfoHtml}
    ${positionInfoHtml}
    ${telemetryInfoHtml}
    ${textMessagesHtml}
    ${mapReportHtml}
    ${tracerouteHtml}
    </div>
  `;
};

const renderPath = async (nodeId) => {
  if (!nodeId) return;

  try {
    const gpsData = await meshtasticApi.getGpsTrack(nodeId);

    if (!gpsData || !gpsData.length) return;

    const polyline = new ymaps.Polyline(
      gpsData.map(({ latitudeI, longitudeI }) => [
        latitudeI / 10000,
        longitudeI / 10000,
      ]),
      {},
      {
        strokeColor: MAP_CONFIG.PATH_STROKE_COLOR,
        strokeWidth: MAP_CONFIG.PATH_STROKE_WIDTH,
      }
    );

    map.geoObjects.add(polyline);
  } catch (error) {
    console.error("Ошибка отображения пути:", error);
  }
};

const renderBallons = (devices, isUpdate = false) => {
  try {
    if (!devices || Object.keys(devices).length === 0) {
      return;
    }

    if (isUpdate) {
      clearDeviceMarkers();
    }

    const placemarks = [];
    const state = map.action.getCurrentState();
    const now = Date.now();

    for (const index in devices) {
      const device = devices[index];
      const nodeId = device.device_id || device.hex_id || device.id || index;

      if (!device.latitude || !device.longitude) continue;

      const deviceTime = device.s_time;
      const timeDiffHours = (now - deviceTime) / (1000 * 60 * 60);

      if (timeDiffHours > 24) continue;

      const bounds = map.getBounds();
      if (!isPointInBounds(device.latitude, device.longitude, bounds)) continue;

      let presetcolor;
      let iconOptions = {};

      if (timeDiffHours < 6 && (device.mqtt === "1" || device.mqtt === 1)) {
        // Если точка онлайн И подключена через MQTT - зеленая
        presetcolor = MAP_PRESETS.MQTT;
        iconOptions = {
          preset: `${presetcolor}`,
        };
      } else if (timeDiffHours < 6) {
        // Если точка онлайн, но НЕ MQTT - цвет ONLINE
        presetcolor = MAP_PRESETS.ONLINE;
        iconOptions = {
          preset: `${presetcolor}`,
        };
      } else if (timeDiffHours >= 6) {
        // Если точка не передавала данные больше 6 часов - серая
        presetcolor = MAP_PRESETS.INACTIVE;
        iconOptions = {
          preset: `${presetcolor}`,
        };
      }
      // Иначе точку не показываем (iconOptions остается пустым)

      const timestampfooter = formatTime(device.s_time);

      const placemark = new window.ymaps.Placemark(
        [device.latitude, device.longitude],
        {
          iconContent: device.shortName,
          balloonContentHeader: device.longName + " (" + device.shortName + ")",
          balloonContentBody: `
    <div style="max-width: 350px; font-size: 12px;">

    <div style="margin-top: 8px; color: #666;">🔄 Загрузка информации об узле...</div>
    </div>
    `,
          balloonContentFooter: `Updated: ${timestampfooter}`,
          clusterCaption: `Node: <strong>${
            device.shortName || device.short_name || nodeId
          }</strong>`,
          nodeId,
        },
        iconOptions
      );

      placemark.events.add("balloonopen", async (event) => {
        const nodeId =
          event.originalEvent.currentTarget.properties._data.nodeId;
        openedNodeId = nodeId;
        renderPath(openedNodeId);

        // Загружаем полное содержимое баллуна
        try {
          const fullContent = await createBalloonContent(device, nodeId);
          placemark.properties.set("balloonContentBody", fullContent);
        } catch (error) {
          console.error("Ошибка загрузки содержимого баллуна:", error);
          placemark.properties.set(
            "balloonContentBody",
            `
    <div style="max-width: 350px; font-size: 12px;">
    <div style="margin-top: 8px; color: #f44336;">❌ Ошибка загрузки данных</div>
    </div>
    `
          );
        }
      });
      placemarks.push(placemark);
    }

    if (state.zoom > MAP_CONFIG.MIN_ZOOM_FOR_INDIVIDUAL_MARKERS) {
      placemarks.forEach((p) => {
        map.geoObjects.add(p);

        if (openedNodeId && p.properties._data.nodeId === openedNodeId) {
          const length = map.geoObjects.getLength();
          const geometryObject = map.geoObjects.get(length - 1);

          geometryObject.balloon.events.add("beforeuserclose", () => {
            openedNodeId = null;
          });

          geometryObject.balloon.open(undefined, undefined, {
            balloonAutoPan: false,
          });
        }
      });

      pointsOnMap.value = placemarks.length;
      return;
    }

    const clusterer = new ymaps.Clusterer({
      preset: MAP_PRESETS.CLUSTER,
      gridSize: MAP_CONFIG.CLUSTER_GRID_SIZE,
      groupByCoordinates: false,
      clusterDisableClickZoom: true,
      clusterHideIconOnBalloonOpen: false,
      geoObjectHideIconOnBalloonOpen: false,
    });

    clusterer.add(placemarks);
    map.geoObjects.add(clusterer);
    pointsOnMap.value = placemarks.length;
  } catch (error) {
    console.error("❌ Ошибка в renderBallons:", error);
    pointsOnMap.value = 0;
  }
};

const fetchDevicesData = async () => {
  try {
    const response = await fetch("https://meshtasticback.taubetele.com/dots");
    const data = await response.json();

    if (data && data.data) {
      devices.value = data.data;
      const count = Object.keys(data.data).length;
      emit("devicesCount", count);

      if (typeof debouncedRenderBallons === "function") {
        debouncedRenderBallons(devices.value, false);
      }
    } else {
      devices.value = {};
      emit("devicesCount", 0);
    }
  } catch (error) {
    console.error("❌ Ошибка загрузки данных устройств:", error);
    devices.value = {};
    emit("devicesCount", 0);
  }
};

let updateInterval = null;

const startDataUpdates = () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  updateInterval = setInterval(async () => {
    await updateDevicesData();
  }, 30000);
};

const stopDataUpdates = () => {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
};

const clearDeviceMarkers = () => {
  if (!map) return;
  map.geoObjects.removeAll();
  pointsOnMap.value = 0;
};

const updateDevicesData = async () => {
  try {
    const response = await fetch("https://meshtasticback.taubetele.com/dots");
    const data = await response.json();

    if (data && data.data) {
      devices.value = data.data;
      const count = Object.keys(data.data).length;
      emit("devicesCount", count);

      if (typeof debouncedRenderBallons === "function") {
        debouncedRenderBallons(devices.value, true);
      }
    }
  } catch (error) {
    console.error("❌ Ошибка обновления данных устройств:", error);
  }
};

onMounted(async () => {
  // Проверяем наличие API ключа
  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
  if (!apiKey) {
    console.error(
      "❌ Yandex Maps API ключ не найден! Создайте файл .env с VITE_YANDEX_MAPS_API_KEY"
    );
    geolocationStatus.value = {
      type: "error",
      message: "❌ API ключ Yandex Maps не найден. Создайте файл .env",
    };
    return;
  }

  startDataUpdates();

  onUnmounted(() => {
    stopDataUpdates();
  });

  const renderSelfBallon = (shouldSetCenter = false) => {
    // Проверяем поддержку геолокации
    if (!navigator.geolocation) {
      geolocationStatus.value = {
        type: "error",
        message: "Геолокация не поддерживается браузером",
      };
      if (shouldSetCenter) {
        map.setCenter(MAP_CONFIG.DEFAULT_CENTER, MAP_CONFIG.DEFAULT_ZOOM);
      }
      return;
    }

    // Сначала пробуем браузерную геолокацию
    navigator.geolocation.getCurrentPosition(
      (position) => {
        try {
          const coords = [position.coords.latitude, position.coords.longitude];

          // Создаем маркер геолокации
          const geolocationPlacemark = new ymaps.Placemark(
            coords,
            {
              balloonContentBody: "Вы здесь!",
            },
            {
              preset: MAP_PRESETS.GEOLOCATION,
            }
          );

          map.geoObjects.add(geolocationPlacemark);

          if (shouldSetCenter) {
            map.setCenter(coords, MAP_CONFIG.DEFAULT_ZOOM + 8);
          }
        } catch (error) {
          console.error("Ошибка обработки браузерной геолокации:", error);
          geolocationStatus.value = {
            type: "error",
            message: "Ошибка обработки геолокации",
          };
          if (shouldSetCenter) {
            map.setCenter(MAP_CONFIG.DEFAULT_CENTER, MAP_CONFIG.DEFAULT_ZOOM);
          }
        }
      },
      (error) => {
        console.warn("Браузерная геолокация недоступна:", error.message);

        geolocationStatus.value = {
          type: "warning",
          message:
            "Браузерная геолокация недоступна, пробуем альтернативный способ...",
        };

        // Fallback к Yandex Maps геолокации
        ymaps.geolocation
          .get({
            provider: "auto",
            mapStateAutoApply: false,
            timeout: 10000,
          })
          .then(function (result) {
            try {
              result.geoObjects.options.set("preset", MAP_PRESETS.GEOLOCATION);
              result.geoObjects
                .get(0)
                .properties.set({ balloonContentBody: "Вы здесь!" });
              map.geoObjects.add(result.geoObjects);

              if (shouldSetCenter) {
                const coords = result.geoObjects
                  .get(0)
                  .geometry.getCoordinates();
                map.setCenter(coords, MAP_CONFIG.DEFAULT_ZOOM + 1);
              }
            } catch (error) {
              console.error("Ошибка обработки Yandex Maps геолокации:", error);
              geolocationStatus.value = {
                type: "error",
                message: "Ошибка обработки Yandex Maps геолокации",
              };
              if (shouldSetCenter) {
                map.setCenter(
                  MAP_CONFIG.DEFAULT_CENTER,
                  MAP_CONFIG.DEFAULT_ZOOM
                );
              }
            }
          })
          .catch(function (error) {
            console.error("Ошибка получения Yandex Maps геолокации:", error);
            geolocationStatus.value = {
              type: "error",
              message: "Не удалось определить местоположение",
            };
            if (shouldSetCenter) {
              map.setCenter(MAP_CONFIG.DEFAULT_CENTER, MAP_CONFIG.DEFAULT_ZOOM);
            }
          });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 минута
      }
    );
  };

  const initYMap = () => {
    map = new ymaps.Map("map", {
      center: MAP_CONFIG.DEFAULT_CENTER,
      zoom: MAP_CONFIG.DEFAULT_ZOOM,
    });
    map.controls.remove("fullscreenControl");
    map.controls.remove("searchControl");

    let infoButton = new ymaps.control.Button("INFO");
    map.controls.add(infoButton, {
      selectOnClick: false,
      float: "left",
      floatIndex: 1,
    });
    infoButton.events.add("click", function () {
      emit("infoOpen");
    });

    const onBoundsChange = () => {
      filteredDevicesCache.value.clear();
      map.geoObjects.removeAll();
      pointsOnMap.value = 0;
      renderBallons(devices?.value);
    };

    map.events.add(
      "boundschange",
      debounce(onBoundsChange, UI_CONFIG.DEBOUNCE_MAP_DELAY)
    );

    map.events.add("zoomchange", () => {
      onBoundsChange();
    });
  };

  const init = async () => {
    initYMap();
    renderSelfBallon(true);
    await fetchDevicesData();
    debouncedRenderBallons(devices?.value);

    watch(devices, (newDevices) => {
      map.geoObjects?.removeAll();
      pointsOnMap.value = 0;
      filteredDevicesCache.value.clear();
      renderSelfBallon(false);
      debouncedRenderBallons(newDevices);
      renderPath(openedNodeId);
    });
  };

  if (window.ymaps) {
    window.ymaps.ready(() => init().catch(console.error));
  } else {
    const script = document.createElement("script");
    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
    if (!apiKey) {
      console.error(
        "❌ Yandex Maps API ключ не найден! Создайте файл .env с VITE_YANDEX_MAPS_API_KEY"
      );
      return;
    }
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;

    script.onload = () => {
      if (window.ymaps) {
        window.ymaps.ready(() => init().catch(console.error));
      }
    };

    script.onerror = () => {
      console.error("❌ Ошибка загрузки Yandex Maps API");
    };

    document.head.appendChild(script);
  }
});
</script>

<style lang="scss">
.node-counter {
  position: absolute;
  bottom: 35px;
  left: 7px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.1);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  z-index: 1000;
  user-select: none;
  pointer-events: none;
}

.update-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 11px;
  color: #666;
}

.update-dot {
  width: 6px;
  height: 6px;
  background: #4caf50;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.update-text {
  font-size: 10px;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  40% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

.geolocation-status {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(5px);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.1);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  z-index: 1000;
  user-select: none;
  pointer-events: none;
  max-width: 300px;
  word-wrap: break-word;
}

.geolocation-status .success {
  color: #2e7d32;
}

.geolocation-status .warning {
  color: #f57c00;
}

.geolocation-status .error {
  color: #d32f2f;
}
</style>
