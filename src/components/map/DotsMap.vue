<template>
  <div id="map" class="w-full h-full" @click="handleMapClick">
    <div class="node-counter">
      <span v-if="Object.keys(devices).length === 0"
        >🔄 Загрузка данных...</span
      >
      <span v-else>
        Узлов: {{ Object.keys(devices).length }} |
        <span
          v-if="
            map && map.getZoom() <= MAP_CONFIG.MIN_ZOOM_FOR_INDIVIDUAL_MARKERS
          "
        >
          Кластеров: {{ pointsOnMap }}
        </span>
        <span v-else> Видимых: {{ pointsOnMap }} </span>
      </span>
      <div class="update-indicator" v-if="updateInterval">
        <span class="update-dot"></span>
        <span class="update-text">Автообновление 60сек</span>
      </div>
    </div>

    <!-- Геолокация статус -->
    <div class="geolocation-status" v-if="geolocationStatus">
      <span :class="geolocationStatus.type">{{
        geolocationStatus.message
      }}</span>
    </div>

    <!-- Кнопка закрытия истории местоположений -->
    <div
      class="close-history-button"
      v-if="isLocationHistoryActive"
      @click="closeLocationHistory"
    >
      <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 0 384 512">
        <path
          d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"
          fill="currentColor"
        />
      </svg>
      <span v-if="locationHistories.length > 1"
        >Закрыть все истории ({{ locationHistories.length }})</span
      >
      <span v-else>Закрыть историю</span>
    </div>

    <!-- Chart Modal -->
    <ChartModal
      v-if="showChartModal"
      :nodeId="selectedNodeId"
      :deviceName="selectedDeviceName"
      @close="closeChartModal"
    />
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
  ICONS,
} from "../../utils/constants.js";
import { debounce, isPointInBounds } from "../../utils/helpers.js";
import { meshtasticApi } from "../../utils/api.js";
import ChartModal from "../ChartModal.vue";

const emit = defineEmits([
  "infoOpen",
  "devicesCount",
  "searchOpen",
  "focusOnDevice",
]);

const props = defineProps({
  devices: {
    type: Object,
    default: () => ({}),
  },
});

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
const isDataLoaded = ref(false); // Флаг загрузки данных
const showChartModal = ref(false);
const selectedNodeId = ref(null);
const selectedDeviceName = ref("");
const isLocationHistoryActive = ref(false);
const locationHistories = ref([]); // Array to store multiple location histories
let historyColorIndex = 0; // Index for rotating through colors

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

const debouncedRenderBallons = debounce(
  (
    devices,
    isUpdate,
    openedBalloonInfo = null,
    openedBalloonContent = null
  ) => {
    renderBallons(devices, isUpdate, openedBalloonInfo, openedBalloonContent);
  },
  500
);

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

// Функция для получения longname по hex ID
const getGatewayLongName = async (hexId) => {
  if (!hexId) return null;

  try {
    // Конвертируем hex ID в numeric
    const numericId = parseInt(hexId.replace("!", ""), 16);

    // Делаем запрос к API для получения информации об узле
    const response = await fetch(
      `https://meshtasticback.taubetele.com/NODEINFO_APP:${numericId}`
    );

    if (response.ok) {
      const data = await response.json();
      if (data && data.data && data.data.length > 0) {
        // Берем последнюю запись (первую в массиве, так как они отсортированы по времени)
        const latestNodeInfo = data.data[0];
        // Ищем long_name в rawData
        if (latestNodeInfo.rawData && latestNodeInfo.rawData.long_name) {
          return latestNodeInfo.rawData.long_name;
        }
        // Fallback к другим полям
        return latestNodeInfo.longName || latestNodeInfo.long_name || hexId;
      }
    }
  } catch (error) {
    console.warn("Ошибка получения longname для gateway:", hexId, error);
  }

  return hexId; // Возвращаем исходный hex ID если не удалось получить longname
};

// Function to open chart modal
const openChartModal = (nodeId, deviceName) => {
  console.log("DotsMap openChartModal:", { nodeId, deviceName });
  // Close any open balloon first
  if (map) {
    map.balloon.close();
  }
  selectedNodeId.value = nodeId;
  selectedDeviceName.value = deviceName;
  showChartModal.value = true;
};

// Function to close chart modal
const closeChartModal = () => {
  showChartModal.value = false;
  selectedNodeId.value = null;
  selectedDeviceName.value = "";
};

// Make function available globally for onclick handlers
window.openChartModal = openChartModal;

// Function to show location history
const showLocationHistory = async (nodeId, deviceName) => {
  console.log("showLocationHistory:", { nodeId, deviceName });

  // Close any open balloon first
  if (map) {
    map.balloon.close();
  }

  try {
    // Check if history for this device is already displayed
    const existingHistoryIndex = locationHistories.value.findIndex(
      (h) => h.nodeId === nodeId
    );
    if (existingHistoryIndex !== -1) {
      geolocationStatus.value = {
        type: "warning",
        message: "📍 История этого устройства уже отображается",
      };
      setTimeout(() => {
        if (geolocationStatus.value?.type === "warning") {
          geolocationStatus.value = null;
        }
      }, 3000);
      return;
    }

    // Fetch position data
    const positionData = await meshtasticApi.getPositionInfo(nodeId);

    if (!positionData || !positionData.data || positionData.data.length === 0) {
      geolocationStatus.value = {
        type: "warning",
        message: "📍 Нет данных о местоположениях для этого устройства",
      };
      setTimeout(() => {
        if (geolocationStatus.value?.type === "warning") {
          geolocationStatus.value = null;
        }
      }, 5000);
      return;
    }

    // Clear all device markers only on first history
    if (locationHistories.value.length === 0) {
      clearDeviceMarkers();
    }

    // Filter positions with valid coordinates
    const positions = positionData.data
      .filter(
        (pos) =>
          pos.rawData &&
          pos.rawData.latitude_i !== undefined &&
          pos.rawData.longitude_i !== undefined
      )
      .slice(0, 200); // Limit to 200 positions as requested

    if (positions.length === 0) {
      geolocationStatus.value = {
        type: "warning",
        message: "📍 Нет валидных координат для этого устройства",
      };
      setTimeout(() => {
        if (geolocationStatus.value?.type === "warning") {
          geolocationStatus.value = null;
        }
      }, 5000);
      return;
    }

    // Get color for this history
    const colorConfig =
      MAP_PRESETS.HISTORY_COLORS[
        historyColorIndex % MAP_PRESETS.HISTORY_COLORS.length
      ];
    historyColorIndex++;

    // Create array of coordinates for polyline
    const coordinates = positions.map((pos) => [
      pos.rawData.latitude_i / 1e7,
      pos.rawData.longitude_i / 1e7,
    ]);

    // Draw polyline connecting all positions
    const polyline = new ymaps.Polyline(
      coordinates,
      {},
      {
        strokeColor: colorConfig.stroke,
        strokeWidth: 3,
        strokeOpacity: 0.7,
      }
    );
    map.geoObjects.add(polyline);

    // Store objects for this history
    const historyObjects = [polyline];

    // Add markers for each position
    positions.forEach((pos, index) => {
      const coords = [
        pos.rawData.latitude_i / 1e7,
        pos.rawData.longitude_i / 1e7,
      ];

      const timestamp = formatTime(pos.timestamp);
      const isFirst = index === 0;
      const isLast = index === positions.length - 1;

      let label = "";
      if (isFirst) {
        label = "Последнее";
      } else if (isLast) {
        label = "Первое";
      }

      const placemark = new ymaps.Placemark(
        coords,
        {
          balloonContentHeader: `${deviceName} - ${label || "История"}`,
          balloonContentBody: `
            <div style="font-size: 12px;">
              <div style="margin-bottom: 4px;"><strong>Устройство:</strong> ${deviceName}</div>
              <div style="margin-bottom: 4px;"><strong>Время:</strong> ${timestamp}</div>
              <div style="margin-bottom: 4px;"><strong>Координаты:</strong> ${coords[0].toFixed(
                4
              )}, ${coords[1].toFixed(4)}</div>
              ${
                pos.rawData.altitude !== undefined
                  ? `<div style="margin-bottom: 4px;"><strong>Высота:</strong> ${pos.rawData.altitude} м</div>`
                  : ""
              }
              ${
                pos.rawData.sats_in_view !== undefined
                  ? `<div><strong>Спутников:</strong> ${pos.rawData.sats_in_view}</div>`
                  : ""
              }
            </div>
          `,
          iconContent: label || (index + 1).toString(),
        },
        {
          preset: colorConfig.preset,
        }
      );

      map.geoObjects.add(placemark);
      historyObjects.push(placemark);
    });

    // Store this history
    locationHistories.value.push({
      nodeId,
      deviceName,
      color: colorConfig.stroke,
      objects: historyObjects,
      pointsCount: positions.length,
    });

    // Fit map bounds to show all positions
    if (coordinates.length > 0) {
      const bounds = ymaps.util.bounds.fromPoints(coordinates);
      map.setBounds(bounds, {
        checkZoomRange: true,
        zoomMargin: 50,
      });
    }

    // Activate location history mode
    isLocationHistoryActive.value = true;

    // Show success message
    geolocationStatus.value = {
      type: "success",
      message: `📍 История ${deviceName}: ${positions.length} точек (всего историй: ${locationHistories.value.length})`,
    };
    setTimeout(() => {
      if (geolocationStatus.value?.type === "success") {
        geolocationStatus.value = null;
      }
    }, 5000);

    // Update points counter
    const totalPoints = locationHistories.value.reduce(
      (sum, h) => sum + h.pointsCount,
      0
    );
    pointsOnMap.value = totalPoints;
  } catch (error) {
    console.error("Ошибка отображения истории местоположений:", error);
    geolocationStatus.value = {
      type: "error",
      message: "❌ Ошибка загрузки истории местоположений",
    };
    setTimeout(() => {
      if (geolocationStatus.value?.type === "error") {
        geolocationStatus.value = null;
      }
    }, 5000);
  }
};

// Function to close location history and restore normal view
const closeLocationHistory = async () => {
  // Remove all history objects from map
  if (map) {
    locationHistories.value.forEach((history) => {
      history.objects.forEach((obj) => {
        map.geoObjects.remove(obj);
      });
    });
  }

  // Clear histories array
  const historiesCount = locationHistories.value.length;
  locationHistories.value = [];
  historyColorIndex = 0; // Reset color index

  // Deactivate location history mode
  isLocationHistoryActive.value = false;

  // Restore geolocation marker
  const renderSelfBallon = (shouldSetCenter = false) => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        try {
          const coords = [position.coords.latitude, position.coords.longitude];
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
        } catch (error) {
          console.error("Ошибка восстановления геолокации:", error);
        }
      },
      () => {},
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000,
      }
    );
  };

  renderSelfBallon(false);

  // Restore device markers
  await updateDevicesData();

  // Show status message
  geolocationStatus.value = {
    type: "success",
    message: `✓ Закрыто историй: ${historiesCount}`,
  };
  setTimeout(() => {
    if (geolocationStatus.value?.type === "success") {
      geolocationStatus.value = null;
    }
  }, 3000);
};

// Make function available globally for onclick handlers
window.showLocationHistory = showLocationHistory;

const createBalloonContent = async (device, nodeId) => {
  let nodeInfoHtml = "";
  let positionInfoHtml = "";
  let telemetryInfoHtml = "";
  let textMessagesHtml = "";
  let mapReportHtml = "";
  let tracerouteHtml = "";
  let hasAnyData = false;

  try {
    const nodeInfo = await meshtasticApi.getNodeInfo(nodeId);
    if (nodeInfo && nodeInfo.data && nodeInfo.data.length > 0) {
      hasAnyData = true;
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
      rawData.hwModel
        ? `<span>Модель:</span><span>${HARDWARE_MODELS[rawData.hwModel]}</span>`
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
            const gatewayLongName = latestInfo.gatewayId
              ? await getGatewayLongName(latestInfo.gatewayId)
              : null;
            const mqttLine = `Данные: Через MQTT${
              gatewayLongName
                ? ` | Gateway: <a href="#" onclick="focusOnDeviceByHex('${latestInfo.gatewayId}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${gatewayLongName}</a>`
                : ""
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
              const gatewayLongName = latestInfo.gatewayId
                ? await getGatewayLongName(latestInfo.gatewayId)
                : null;
              nodeInfoHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${nodeMetrics.join(" | ")}</div>
    ${
      gatewayLongName
        ? `<div style="margin-top: 1px;">Gateway: <a href="#" onclick="focusOnDeviceByHex('${latestInfo.gatewayId}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${gatewayLongName}</a></div>`
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
    // Ошибка загрузки информации об узле - продолжаем работу
  }

  try {
    const positionInfo = await meshtasticApi.getPositionInfo(nodeId);
    if (positionInfo && positionInfo.data && positionInfo.data.length > 0) {
      hasAnyData = true;
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
            latestPosition.rawData.latitude_i / 1e7
          ).toFixed(4)}, ${(latestPosition.rawData.longitude_i / 1e7).toFixed(
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
          const gatewayLongName = latestPosition.gatewayId
            ? await getGatewayLongName(latestPosition.gatewayId)
            : null;
          const mqttLine = `Данные: Через MQTT${
            gatewayLongName
              ? ` | Gateway: <a href="#" onclick="focusOnDeviceByHex('${latestPosition.gatewayId}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${gatewayLongName}</a>`
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
            const gatewayLongName = latestPosition.gatewayId
              ? await getGatewayLongName(latestPosition.gatewayId)
              : null;
            positionInfoHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${positionMetrics.join(" | ")}</div>
    ${
      gatewayLongName
        ? `<div style="margin-top: 1px;">Gateway: <a href="#" onclick="focusOnDeviceByHex('${latestPosition.gatewayId}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${gatewayLongName}</a></div>`
        : ""
    }
    </div>
    `;
          }
        }
      }
    }
  } catch (error) {
    // Ошибка загрузки информации о позиции - продолжаем работу
  }

  try {
    const telemetryInfo = await meshtasticApi.getTelemetryInfo(nodeId);
    if (telemetryInfo && telemetryInfo.data && telemetryInfo.data.length > 0) {
      hasAnyData = true;
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
            const gatewayLongName = latestDeviceMetrics.gatewayId
              ? await getGatewayLongName(latestDeviceMetrics.gatewayId)
              : null;
            const mqttLine = `Данные: Через MQTT${
              gatewayLongName
                ? ` | Gateway: <a href="#" onclick="focusOnDeviceByHex('${latestDeviceMetrics.gatewayId}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${gatewayLongName}</a>`
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
              const gatewayLongName = latestDeviceMetrics.gatewayId
                ? await getGatewayLongName(latestDeviceMetrics.gatewayId)
                : null;
              deviceMetricsHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${deviceMetrics.join(" | ")}</div>
    ${
      gatewayLongName
        ? `<div style="margin-top: 1px;">Gateway: <a href="#" onclick="focusOnDeviceByHex('${latestDeviceMetrics.gatewayId}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${gatewayLongName}</a></div>`
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
            const gatewayLongName = latestEnvironmentMetrics.gatewayId
              ? await getGatewayLongName(latestEnvironmentMetrics.gatewayId)
              : null;
            const mqttLine = `Данные: Через MQTT${
              gatewayLongName
                ? ` | Gateway: <a href="#" onclick="focusOnDeviceByHex('${latestEnvironmentMetrics.gatewayId}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${gatewayLongName}</a>`
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
              const gatewayLongName = latestEnvironmentMetrics.gatewayId
                ? await getGatewayLongName(latestEnvironmentMetrics.gatewayId)
                : null;
              environmentMetricsHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${envMetrics.join(" | ")}</div>
    ${
      gatewayLongName
        ? `<div style="margin-top: 1px;">Gateway: <a href="#" onclick="focusOnDeviceByHex('${latestEnvironmentMetrics.gatewayId}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${gatewayLongName}</a></div>`
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
    // Ошибка загрузки телеметрии - продолжаем работу
  }

  try {
    const textMessages = await meshtasticApi.getTextMessages(nodeId);
    if (textMessages && textMessages.data && textMessages.data.length > 0) {
      hasAnyData = true;
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
            const gatewayLongName = latestMessage.gatewayId
              ? await getGatewayLongName(latestMessage.gatewayId)
              : null;
            const mqttLine = `Данные: Через MQTT${
              gatewayLongName
                ? ` | Gateway: <a href="#" onclick="focusOnDeviceByHex('${latestMessage.gatewayId}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${gatewayLongName}</a>`
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
              const gatewayLongName = latestMessage.gatewayId
                ? await getGatewayLongName(latestMessage.gatewayId)
                : null;
              textMessagesHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${messageMetrics.join(" | ")}</div>
    ${
      gatewayLongName
        ? `<div style="margin-top: 1px;">Gateway: <a href="#" onclick="focusOnDeviceByHex('${latestMessage.gatewayId}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${gatewayLongName}</a></div>`
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
    // Ошибка загрузки текстовых сообщений - продолжаем работу
  }

  try {
    const mapReportInfo = await meshtasticApi.getMapReportInfo(nodeId);
    if (mapReportInfo && mapReportInfo.data && mapReportInfo.data.length > 0) {
      hasAnyData = true;
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
      rawData.decoded.hwModel !== undefined
        ? `<span>Модель:</span><span>${
            HARDWARE_MODELS[rawData.decoded.hwModel]
          }</span>`
        : ""
    }
    ${
      rawData.decoded.firmwareVersion
        ? `<span>Прошивка:</span><span>${rawData.decoded.firmwareVersion}</span>`
        : ""
    }
    ${
      rawData.decoded.region !== undefined
        ? `<span>Регион:</span><span>${REGIONS[rawData.decoded.region]}</span>`
        : ""
    }
    ${
      rawData.decoded.modemPreset !== undefined
        ? `<span>Пресет модема:</span><span>${rawData.decoded.modemPreset}</span>`
        : ""
    }
    ${
      rawData.decoded.hasDefaultChannel !== undefined
        ? `<span>Канал по умолчанию:</span><span>${
            rawData.decoded.hasDefaultChannel ? "Да" : "Нет"
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
            const gatewayLongName = latestReport.gatewayId
              ? await getGatewayLongName(latestReport.gatewayId)
              : null;
            const mqttLine = `Данные: Через MQTT${
              gatewayLongName
                ? ` | Gateway: <a href="#" onclick="focusOnDeviceByHex('${latestReport.gatewayId}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${gatewayLongName}</a>`
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
              const gatewayLongName = latestReport.gatewayId
                ? await getGatewayLongName(latestReport.gatewayId)
                : null;
              mapReportHtml += `
    <div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">
    <div>${reportMetrics.join(" | ")}</div>
    ${
      gatewayLongName
        ? `<div style="margin-top: 1px;">Gateway: <a href="#" onclick="focusOnDeviceByHex('${latestReport.gatewayId}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${gatewayLongName}</a></div>`
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
    // Ошибка загрузки отчета карты - продолжаем работу
  }

  // Загружаем данные traceroute
  try {
    const tracerouteInfo = await meshtasticApi.getTracerouteInfo(nodeId);
    if (
      tracerouteInfo &&
      tracerouteInfo.data &&
      tracerouteInfo.data.length > 0
    ) {
      hasAnyData = true;
      // Берем последнюю запись (самую свежую)
      const latestTrace = tracerouteInfo.data[0];
      const rawData = latestTrace.rawData;

      // Получаем информацию о целевом узле для отображения longName
      let targetNodeLongName = null;
      try {
        const targetNodeInfo = await meshtasticApi.getNodeInfo(
          latestTrace.to.toString(16)
        );
        if (
          targetNodeInfo &&
          targetNodeInfo.data &&
          targetNodeInfo.data.length > 0
        ) {
          targetNodeLongName = targetNodeInfo.data[0].longName;
        }
      } catch (error) {
        // Если не удалось получить информацию о целевом узле, используем hex ID
      }

      // Ищем обратный маршрут (от получателя к отправителю)
      let reverseTraceroute = null;
      try {
        if (rawData && rawData.route && rawData.route.length > 0) {
          // Конвертируем hex ID в числовой для поиска
          const toNodeId = parseInt(latestTrace.to.toString(16), 16);

          // Ищем traceroute в обратном направлении по числовому ID
          const reverseTracerouteInfo = await meshtasticApi.getTracerouteInfo(
            toNodeId.toString(16)
          );

          if (
            reverseTracerouteInfo &&
            reverseTracerouteInfo.data &&
            reverseTracerouteInfo.data.length > 0
          ) {
            // Ищем запись, где получатель = отправитель исходного traceroute
            for (const trace of reverseTracerouteInfo.data) {
              if (trace.to === latestTrace.from) {
                reverseTraceroute = trace;
                break;
              }
            }
          }

          // Если не нашли через API, попробуем использовать route_back из исходных данных
          if (
            !reverseTraceroute &&
            rawData.route_back &&
            rawData.route_back.length > 0
          ) {
            // route_back данные будут использованы ниже
          }
        }
      } catch (error) {
        // Это не критическая ошибка, продолжаем работу
      }

      if (rawData) {
        // Формируем компактный маршрут с SNR
        let routeDisplay = "";

        if (rawData.route && rawData.route.length > 0) {
          // Создаем маршрут с SNR для каждого хопа
          const routeParts = [];

          // Добавляем источник
          const fromHex = `!${latestTrace.from.toString(16)}`;
          const fromLongName = await getGatewayLongName(fromHex);
          routeParts.push(
            `<a href="#" onclick="focusOnDeviceByHex('${fromHex}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${fromLongName}</a>`
          );

          // Добавляем промежуточные узлы с SNR
          for (let i = 0; i < rawData.route.length; i++) {
            const nodeHex = `!${rawData.route[i].toString(16)}`;
            const nodeLongName = await getGatewayLongName(nodeHex);
            const snr =
              rawData.snr_towards && rawData.snr_towards[i]
                ? `(${rawData.snr_towards[i]}dB)`
                : "";
            routeParts.push(
              `<a href="#" onclick="focusOnDeviceByHex('${nodeHex}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${nodeLongName}</a>${snr}`
            );
          }

          // Добавляем назначение
          const toHex = `!${latestTrace.to.toString(16)}`;
          const toLongName =
            targetNodeLongName || (await getGatewayLongName(toHex));
          routeParts.push(
            `<a href="#" onclick="focusOnDeviceByHex('${toHex}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${toLongName}</a>`
          );

          routeDisplay = routeParts.join(" → ");
        } else {
          // Если нет промежуточных узлов, показываем прямой маршрут
          const fromHex = `!${latestTrace.from.toString(16)}`;
          const fromLongName = await getGatewayLongName(fromHex);
          const toHex = `!${latestTrace.to.toString(16)}`;
          const toLongName =
            targetNodeLongName || (await getGatewayLongName(toHex));
          routeDisplay = `<a href="#" onclick="focusOnDeviceByHex('${fromHex}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${fromLongName}</a> → <a href="#" onclick="focusOnDeviceByHex('${toHex}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${toLongName}</a>`;
        }

        // Формируем обратный маршрут если есть
        let backRouteDisplay = "";
        if (
          reverseTraceroute &&
          reverseTraceroute.rawData &&
          reverseTraceroute.rawData.route &&
          reverseTraceroute.rawData.route.length > 0
        ) {
          // Используем найденный обратный traceroute
          const backParts = [];

          // Добавляем источник (получатель исходного traceroute)
          const reverseFromHex = `!${reverseTraceroute.from.toString(16)}`;
          const reverseFromLongName = await getGatewayLongName(reverseFromHex);
          backParts.push(
            `<a href="#" onclick="focusOnDeviceByHex('${reverseFromHex}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${reverseFromLongName}</a>`
          );

          // Добавляем промежуточные узлы с SNR
          for (let i = 0; i < reverseTraceroute.rawData.route.length; i++) {
            const nodeHex = `!${reverseTraceroute.rawData.route[i].toString(
              16
            )}`;
            const nodeLongName = await getGatewayLongName(nodeHex);
            const snr =
              reverseTraceroute.rawData.snr_towards &&
              reverseTraceroute.rawData.snr_towards[i]
                ? `(${reverseTraceroute.rawData.snr_towards[i]}dB)`
                : "";
            backParts.push(
              `<a href="#" onclick="focusOnDeviceByHex('${nodeHex}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${nodeLongName}</a>${snr}`
            );
          }

          // Добавляем назначение (отправитель исходного traceroute)
          const reverseToHex = `!${reverseTraceroute.to.toString(16)}`;
          const reverseToLongName = await getGatewayLongName(reverseToHex);
          backParts.push(
            `<a href="#" onclick="focusOnDeviceByHex('${reverseToHex}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${reverseToLongName}</a>`
          );

          backRouteDisplay = backParts.join(" → ");
        } else if (rawData.route_back && rawData.route_back.length > 0) {
          // Fallback к данным route_back если есть
          const backParts = [];

          // Добавляем назначение исходного traceroute (откуда идет обратный маршрут)
          const toHex = `!${latestTrace.to.toString(16)}`;
          const toLongName = await getGatewayLongName(toHex);
          backParts.push(
            `<a href="#" onclick="focusOnDeviceByHex('${toHex}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${toLongName}</a>`
          );

          // Добавляем промежуточные узлы с SNR
          for (let i = 0; i < rawData.route_back.length; i++) {
            const nodeHex = `!${rawData.route_back[i].toString(16)}`;
            const nodeLongName = await getGatewayLongName(nodeHex);
            const snr =
              rawData.snr_back && rawData.snr_back[i]
                ? `(${rawData.snr_back[i]}dB)`
                : "";
            backParts.push(
              `<a href="#" onclick="focusOnDeviceByHex('${nodeHex}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${nodeLongName}</a>${snr}`
            );
          }

          // Добавляем источник исходного traceroute (куда идет обратный маршрут)
          const fromHex = `!${latestTrace.from.toString(16)}`;
          const fromLongName = await getGatewayLongName(fromHex);
          backParts.push(
            `<a href="#" onclick="focusOnDeviceByHex('${fromHex}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${fromLongName}</a>`
          );

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
    <div style="margin-bottom: 4px; font-weight: 600; color: #1f2937;">
      От: <a href="#" onclick="focusOnDeviceByHex('!${latestTrace.from.toString(
        16
      )}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${await getGatewayLongName(
          `!${latestTrace.from.toString(16)}`
        )}</a> → К: <a href="#" onclick="focusOnDeviceByHex('!${latestTrace.to.toString(
          16
        )}'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${
          targetNodeLongName ||
          (await getGatewayLongName(`!${latestTrace.to.toString(16)}`))
        }</a>
    </div>
    ${
      routeDisplay
        ? `<div style="margin-bottom: 2px; word-break: break-all;">Туда: ${routeDisplay}</div>`
        : ""
    }
    ${
      backRouteDisplay !== "нет маршрута"
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
        ? `<div style="font-size: 10px; color: #666; margin: 0; line-height: 1.2;">Gateway: <a href="#" onclick="focusOnDeviceByHex('${
            latestTrace.gatewayId
          }'); return false;" style="color: #3b82f6; text-decoration: none; cursor: pointer;">${await getGatewayLongName(
            latestTrace.gatewayId
          )}</a> </div>`
        : ""
    }
    ${
      reverseTraceroute
        ? `<div style="font-size: 10px; color: #666; margin-top: 2px; line-height: 1.2;">Обратный маршрут найден: ${formatTime(
            reverseTraceroute.timestamp
          )}</div>`
        : ""
    }
    </div>
    </div>
    `;
      }
    }
  } catch (error) {
    // Ошибка загрузки данных traceroute - продолжаем работу
  }

  return `
    <div style="max-width: 350px; font-size: 12px;">
    ${
      hasAnyData
        ? `<div style="margin-bottom: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
        <button 
          onclick="window.openChartModal('${nodeId}', '${
            device.longName || device.shortName || nodeId
          }'); return false;" 
          style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s;
            box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
          "
          onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 10px rgba(102, 126, 234, 0.5)';"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(102, 126, 234, 0.3)';"
        >
          <span style="width: 14px; height: 14px; display: inline-flex;">${
            ICONS.CHART
          }</span>
          <span>Графики данных</span>
        </button>
        <button 
          onclick="window.showLocationHistory('${nodeId}', '${
            device.longName || device.shortName || nodeId
          }'); return false;" 
          style="
            background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s;
            box-shadow: 0 2px 6px rgba(255, 107, 53, 0.3);
          "
          onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 10px rgba(255, 107, 53, 0.5)';"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(255, 107, 53, 0.3)';"
        >
          <span style="width: 14px; height: 14px; display: inline-flex;">${
            ICONS.HISTORY
          }</span>
          <span>История местоположений</span>
        </button>
      </div>`
        : ""
    }
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
    // Ошибка отображения пути - продолжаем работу
  }
};

const renderBallons = (
  devices,
  isUpdate = false,
  openedBalloonInfo = null,
  openedBalloonContent = null
) => {
  try {
    if (!devices || Object.keys(devices).length === 0) {
      console.warn("⚠️ renderBallons: нет устройств для отображения");
      return;
    }

    // Сохраняем информацию об открытом баллуне перед обновлением
    let currentOpenedBalloonInfo = openedBalloonInfo;
    let currentOpenedBalloonContent = openedBalloonContent;

    if (isUpdate && openedNodeId && !openedBalloonInfo) {
      // Находим текущий открытый баллун и сохраняем его состояние
      const currentPlacemarks = [];
      map.geoObjects.each((placemark) => {
        currentPlacemarks.push(placemark);
      });

      for (let placemark of currentPlacemarks) {
        if (
          placemark.properties._data &&
          placemark.properties._data.nodeId === openedNodeId &&
          placemark.balloon.isOpen()
        ) {
          currentOpenedBalloonInfo = {
            nodeId: openedNodeId,
            isOpen: true,
          };
          // Сохраняем текущее содержимое баллуна
          currentOpenedBalloonContent =
            placemark.properties.get("balloonContentBody");
          break;
        }
      }
    }

    if (isUpdate) {
      // При обновлении данных полностью очищаем все маркеры
      clearDeviceMarkers();
    } else {
      // При изменении границ карты очищаем только маркеры устройств,
      // но сохраняем геолокацию и пути
      const geoObjectsToKeep = [];

      // Получаем все геообъекты правильным способом
      const allObjects = [];
      map.geoObjects.each((obj) => {
        allObjects.push(obj);
      });

      for (let obj of allObjects) {
        // Сохраняем геолокационные маркеры и пути
        if (
          obj.options &&
          obj.options.get("preset") === MAP_PRESETS.GEOLOCATION
        ) {
          geoObjectsToKeep.push(obj);
        } else if (obj instanceof ymaps.Polyline) {
          geoObjectsToKeep.push(obj);
        }
      }

      // Удаляем все объекты
      map.geoObjects.removeAll();

      // Возвращаем сохраненные объекты
      geoObjectsToKeep.forEach((obj) => {
        map.geoObjects.add(obj);
      });

      pointsOnMap.value = 0;
    }

    const placemarks = [];
    const state = map.action.getCurrentState();
    const now = Date.now();

    let filteredByTime = 0;
    let filteredByBounds = 0;
    let totalDevices = Object.keys(devices).length;

    for (const index in devices) {
      const device = devices[index];
      const nodeId = device.device_id || device.hex_id || device.id || index;

      if (!device.latitude || !device.longitude) continue;

      const deviceTime = device.s_time;
      const timeDiffHours = (now - deviceTime) / (1000 * 60 * 60);

      if (timeDiffHours > 24) {
        filteredByTime++;
        continue;
      }

      const bounds = map.getBounds();

      // Всегда фильтруем устройства по границам карты для оптимизации
      if (bounds) {
        if (!isPointInBounds(device.latitude, device.longitude, bounds)) {
          filteredByBounds++;
          continue;
        }
      }

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
          // Ошибка загрузки содержимого баллуна
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

      placemark.events.add("balloonclose", () => {
        openedNodeId = null;
      });

      placemarks.push(placemark);
    }

    // Получаем зум карты с fallback
    const currentZoom = state?.zoom || map.getZoom();

    if (currentZoom > MAP_CONFIG.MIN_ZOOM_FOR_INDIVIDUAL_MARKERS) {
      placemarks.forEach((p) => {
        map.geoObjects.add(p);

        // Восстанавливаем открытый баллун после обновления данных
        if (
          currentOpenedBalloonInfo &&
          p.properties._data.nodeId === currentOpenedBalloonInfo.nodeId
        ) {
          // Если у нас есть сохраненное содержимое, используем его
          if (currentOpenedBalloonContent) {
            p.properties.set("balloonContentBody", currentOpenedBalloonContent);
          }

          p.balloon.events.add("beforeuserclose", () => {
            openedNodeId = null;
          });

          // Открываем баллун автоматически после обновления
          setTimeout(() => {
            p.balloon.open(undefined, undefined, {
              balloonAutoPan: false,
            });
          }, 100);
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

    // Восстанавливаем открытый баллун для кластеризованных маркеров
    if (currentOpenedBalloonInfo) {
      // Находим маркер с нужным nodeId в кластерере
      const placemarksInCluster = clusterer.getGeoObjects();
      for (let placemark of placemarksInCluster) {
        if (
          placemark.properties._data &&
          placemark.properties._data.nodeId === currentOpenedBalloonInfo.nodeId
        ) {
          // Если у нас есть сохраненное содержимое, используем его
          if (currentOpenedBalloonContent) {
            placemark.properties.set(
              "balloonContentBody",
              currentOpenedBalloonContent
            );
          }

          placemark.balloon.events.add("beforeuserclose", () => {
            openedNodeId = null;
          });

          // Открываем баллун для этого маркера
          setTimeout(() => {
            placemark.balloon.open(undefined, undefined, {
              balloonAutoPan: false,
            });
          }, 100);
          break;
        }
      }
    }

    // Для кластеризации считаем количество кластеров, а не маркеров
    const clusters = clusterer.getClusters();
    pointsOnMap.value = clusters.length;
  } catch (error) {
    console.error("❌ Ошибка в renderBallons:", error);
    pointsOnMap.value = 0;
  }
};

const fetchDevicesData = async () => {
  try {
    const response = await fetch("https://meshtasticback.taubetele.com/dots");
    if (!response.ok) {
      if (response.status === 502) {
        throw new Error(
          "Сервер временно недоступен (502 Bad Gateway). Попробуйте позже."
        );
      } else if (response.status >= 500) {
        throw new Error(
          `Ошибка сервера (${response.status}). Попробуйте позже.`
        );
      } else if (response.status >= 400) {
        throw new Error(
          `Ошибка запроса (${response.status}). Проверьте настройки.`
        );
      }
    }

    const data = await response.json();

    if (data && data.data) {
      devices.value = data.data;
      const count = Object.keys(data.data).length;
      emit("devicesCount", count, data.data);

      if (typeof debouncedRenderBallons === "function") {
        debouncedRenderBallons(devices.value, false, null, null);
      }
    } else {
      devices.value = {};
      emit("devicesCount", 0, {});
    }
  } catch (error) {
    console.error("❌ Ошибка загрузки данных устройств:", error);

    // Показываем пользователю понятное сообщение об ошибке
    if (error.message.includes("Failed to fetch")) {
      geolocationStatus.value = {
        type: "error",
        message:
          "❌ Не удается подключиться к серверу. Проверьте интернет-соединение или попробуйте позже.",
      };
    } else {
      geolocationStatus.value = {
        type: "error",
        message: `❌ ${error.message}`,
      };
    }

    devices.value = {};
    emit("devicesCount", 0, {});

    // Автоматически скрываем ошибку через 10 секунд
    setTimeout(() => {
      if (geolocationStatus.value?.type === "error") {
        geolocationStatus.value = null;
      }
    }, 10000);
  }
};

let updateInterval = null;

const startDataUpdates = () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  updateInterval = setInterval(async () => {
    await updateDevicesData();
  }, 60000);
};

const stopDataUpdates = () => {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
};

const clearDeviceMarkers = () => {
  if (!map) return;

  // Сохраняем геолокационные маркеры и пути
  const geoObjectsToKeep = [];

  // Получаем все геообъекты правильным способом
  const allObjects = [];
  map.geoObjects.each((obj) => {
    allObjects.push(obj);
  });

  for (let obj of allObjects) {
    // Сохраняем геолокационные маркеры (они имеют preset geolocation)
    if (obj.options && obj.options.get("preset") === MAP_PRESETS.GEOLOCATION) {
      geoObjectsToKeep.push(obj);
    }
    // Сохраняем полилинии (пути GPS)
    else if (obj instanceof ymaps.Polyline) {
      geoObjectsToKeep.push(obj);
    }
  }

  // Удаляем все объекты
  map.geoObjects.removeAll();

  // Возвращаем сохраненные объекты
  geoObjectsToKeep.forEach((obj) => {
    map.geoObjects.add(obj);
  });

  pointsOnMap.value = 0;
};

const updateDevicesData = async () => {
  try {
    const response = await fetch("https://meshtasticback.taubetele.com/dots");
    const data = await response.json();

    if (data && data.data) {
      devices.value = data.data;
      const count = Object.keys(data.data).length;
      emit("devicesCount", count, data.data);

      if (typeof debouncedRenderBallons === "function") {
        debouncedRenderBallons(devices.value, true, null, null);
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
    // Очищаем глобальные функции фокусировки
    if (window.focusOnDevice) {
      delete window.focusOnDevice;
    }
    if (window.focusOnDeviceByHex) {
      delete window.focusOnDeviceByHex;
    }
    if (window.openChartModal) {
      delete window.openChartModal;
    }
    if (window.showLocationHistory) {
      delete window.showLocationHistory;
    }
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
            map.setCenter(coords, MAP_CONFIG.DEFAULT_ZOOM + 3);
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
            if (shouldSetCenter) {
              map.setCenter(MAP_CONFIG.DEFAULT_CENTER, MAP_CONFIG.DEFAULT_ZOOM);
            }
          });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000, // 1 минута
      }
    );
  };

  // Функция для фокусировки карты на устройстве и открытия баллуна
  const focusOnDevice = (coordinates) => {
    if (
      !map ||
      !coordinates ||
      !coordinates.latitude ||
      !coordinates.longitude
    ) {
      console.warn("Не удалось сфокусироваться на устройстве:", coordinates);
      return;
    }

    try {
      const coords = [coordinates.latitude, coordinates.longitude];

      // Центрируем карту на координатах устройства с увеличенным зумом
      map.setCenter(coords, MAP_CONFIG.DEFAULT_ZOOM + 7);

      // Показываем статус успешной фокусировки
      geolocationStatus.value = {
        type: "success",
        message: `📍 Карта сфокусирована на устройстве`,
      };

      // Автоматически скрываем статус через 3 секунды
      setTimeout(() => {
        if (geolocationStatus.value?.type === "success") {
          geolocationStatus.value = null;
        }
      }, 3000);

      // Ищем маркер устройства и открываем его баллун
      setTimeout(() => {
        openDeviceBalloon(coordinates);
      }, 500); // Небольшая задержка для завершения анимации карты
    } catch (error) {
      console.error("Ошибка фокусировки на устройстве:", error);
      geolocationStatus.value = {
        type: "error",
        message: "Ошибка фокусировки на устройстве",
      };
    }
  };

  // Функция для открытия баллуна найденного устройства
  const openDeviceBalloon = (coordinates) => {
    if (!map || !coordinates) return;

    try {
      // Получаем nodeId из координат (может быть в device.device_id, device.hex_id или deviceKey)
      const nodeId =
        coordinates.device?.device_id ||
        coordinates.device?.hex_id ||
        coordinates.deviceKey ||
        coordinates.device?.id;

      if (!nodeId) {
        console.warn("Не удалось найти nodeId для устройства:", coordinates);
        return;
      }

      // Ищем маркер с нужным nodeId
      let targetPlacemark = null;

      // Проверяем все геообъекты на карте
      map.geoObjects.each((obj) => {
        // Проверяем обычные маркеры
        if (
          obj.properties &&
          obj.properties._data &&
          obj.properties._data.nodeId === nodeId.toString()
        ) {
          targetPlacemark = obj;
          return false; // Прерываем итерацию
        }
        // Проверяем кластеры
        else if (obj.getGeoObjects) {
          const placemarksInCluster = obj.getGeoObjects();
          for (let placemark of placemarksInCluster) {
            if (
              placemark.properties &&
              placemark.properties._data &&
              placemark.properties._data.nodeId === nodeId.toString()
            ) {
              targetPlacemark = placemark;
              return false; // Прерываем итерацию
            }
          }
        }
      });

      if (targetPlacemark) {
        // Устанавливаем openedNodeId для отслеживания
        openedNodeId = nodeId.toString();

        // Открываем баллун
        targetPlacemark.balloon.open(undefined, undefined, {
          balloonAutoPan: false,
        });

        console.log("Баллун открыт для устройства:", nodeId);
      } else {
        console.warn("Маркер устройства не найден на карте:", nodeId);
        // Показываем сообщение пользователю
        geolocationStatus.value = {
          type: "warning",
          message:
            "Устройство найдено, но не отображается на карте (возможно, вне текущих границ)",
        };
        setTimeout(() => {
          if (geolocationStatus.value?.type === "warning") {
            geolocationStatus.value = null;
          }
        }, 5000);
      }
    } catch (error) {
      console.error("Ошибка открытия баллуна устройства:", error);
    }
  };

  // Функция для фокусировки на устройстве по hex ID
  const focusOnDeviceByHex = async (hexId) => {
    if (!map || !hexId) return;

    try {
      // Конвертируем hex ID в numeric
      const numericId = parseInt(hexId.replace("!", ""), 16);

      // Ищем устройство в данных
      let targetDevice = null;
      let targetDeviceKey = null;

      for (const deviceKey in devices.value) {
        const device = devices.value[deviceKey];
        if (
          device.device_id === numericId ||
          device.hex_id === hexId ||
          device.id === numericId ||
          deviceKey === numericId.toString()
        ) {
          targetDevice = device;
          targetDeviceKey = deviceKey;
          break;
        }
      }

      if (targetDevice && targetDevice.latitude && targetDevice.longitude) {
        // Фокусируемся на устройстве
        const coordinates = {
          latitude: Number(targetDevice.latitude),
          longitude: Number(targetDevice.longitude),
          device: targetDevice,
          deviceKey: targetDeviceKey,
        };

        // Центрируем карту
        const coords = [coordinates.latitude, coordinates.longitude];
        map.setCenter(coords, MAP_CONFIG.DEFAULT_ZOOM + 7);

        // Открываем баллун
        setTimeout(() => {
          openDeviceBalloon(coordinates);
        }, 500);

        console.log("Фокусировка на устройстве по hex ID:", hexId);
      } else {
        console.warn(
          "Устройство с hex ID не найдено или нет координат:",
          hexId
        );
        geolocationStatus.value = {
          type: "warning",
          message: "Устройство не найдено на карте",
        };
        setTimeout(() => {
          if (geolocationStatus.value?.type === "warning") {
            geolocationStatus.value = null;
          }
        }, 3000);
      }
    } catch (error) {
      console.error("Ошибка фокусировки по hex ID:", error);
    }
  };

  // Define onBoundsChange function outside initYMap so it can be accessed from init
  const onBoundsChange = () => {
    // Находим текущий открытый баллун и сохраняем его состояние
    let openedBalloonInfo = null;
    let openedBalloonContent = null;

    if (openedNodeId) {
      const currentPlacemarks = [];
      map.geoObjects.each((obj) => {
        currentPlacemarks.push(obj);
      });

      for (let obj of currentPlacemarks) {
        // Проверяем обычные маркеры
        if (
          obj.properties &&
          obj.properties._data &&
          obj.properties._data.nodeId === openedNodeId &&
          obj.balloon &&
          obj.balloon.isOpen()
        ) {
          openedBalloonInfo = {
            nodeId: openedNodeId,
            isOpen: true,
          };
          openedBalloonContent = obj.properties.get("balloonContentBody");
          break;
        }
        // Проверяем кластеры
        else if (obj.getGeoObjects) {
          const placemarksInCluster = obj.getGeoObjects();
          for (let placemark of placemarksInCluster) {
            if (
              placemark.properties &&
              placemark.properties._data &&
              placemark.properties._data.nodeId === openedNodeId &&
              placemark.balloon.isOpen()
            ) {
              openedBalloonInfo = {
                nodeId: openedNodeId,
                isOpen: true,
              };
              openedBalloonContent =
                placemark.properties.get("balloonContentBody");
              break;
            }
          }
          if (openedBalloonInfo) break;
        }
      }
    }

    // Очищаем кэш фильтрованных устройств для новых границ
    filteredDevicesCache.value.clear();

    // Проверяем, что данные загружены и не пустые
    if (!devices || !devices.value || Object.keys(devices.value).length === 0) {
      return;
    }

    // Перерисовываем маркеры с учетом новых границ карты
    // НЕ очищаем все маркеры, а перерисовываем их
    renderBallons(
      devices?.value,
      false, // isUpdate = false, так как это не обновление данных
      openedBalloonInfo,
      openedBalloonContent
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

    let devicesButton = new ymaps.control.Button("УСТРОЙСТВА");
    map.controls.add(devicesButton, {
      selectOnClick: false,
      float: "left",
      floatIndex: 2,
    });
    devicesButton.events.add("click", function () {
      emit("devicesModalOpen");
    });

    let telegramButton = new ymaps.control.Button("Telegram");
    map.controls.add(telegramButton, {
      selectOnClick: false,
      float: "left",
      floatIndex: 4,
      floatIndex: 100,
    });
    telegramButton.events.add("click", function () {
      window.open("https://t.me/meshtasticmoscow", "_blank");
    });

    let searchButton = new ymaps.control.Button("ПОИСК");
    map.controls.add(searchButton, {
      selectOnClick: false,
      float: "left",
      floatIndex: 3,
    });
    searchButton.events.add("click", function () {
      emit("searchOpen");
    });

    map.events.add(
      "boundschange",
      debounce(onBoundsChange, UI_CONFIG.DEBOUNCE_MAP_DELAY)
    );

    // Обработчик изменения зума - НЕ перерисовываем маркеры, только обновляем счетчик
    map.events.add("zoomchange", () => {
      // При изменении зума НЕ перерисовываем маркеры, чтобы сохранить состояние баллуна
      // Только обновляем счетчик точек в зависимости от текущего зума
      setTimeout(() => {
        updatePointsCount();
      }, 100);
    });

    // Функция для обновления только счетчика точек без перерисовки маркеров
    const updatePointsCount = () => {
      if (!map) return;

      const currentZoom = map.getZoom();
      let count = 0;

      if (currentZoom > MAP_CONFIG.MIN_ZOOM_FOR_INDIVIDUAL_MARKERS) {
        // При индивидуальных маркерах считаем количество маркеров
        map.geoObjects.each((obj) => {
          if (
            obj.properties &&
            obj.properties._data &&
            obj.properties._data.nodeId
          ) {
            count++;
          }
        });
      } else {
        // При кластеризации считаем количество кластеров
        map.geoObjects.each((obj) => {
          if (obj.getGeoObjects) {
            // Это кластер
            const clusters = obj.getClusters();
            count = clusters.length;
          }
        });
      }

      pointsOnMap.value = count;
    };

    // НЕ вызываем onBoundsChange здесь, так как данные об устройствах могут еще не загрузиться
    // onBoundsChange будет вызван в init() после загрузки данных
  };

  const init = async () => {
    initYMap();
    renderSelfBallon(true);
    await fetchDevicesData();

    // Добавляем небольшую задержку для инициализации карты
    setTimeout(() => {
      debouncedRenderBallons(devices?.value, false, null, null);

      // Вызываем onBoundsChange только после загрузки данных об устройствах
      if (devices?.value && Object.keys(devices.value).length > 0) {
        onBoundsChange();
      }
    }, 100);

    // Слушаем событие фокусировки на устройстве
    emit("focusOnDevice", focusOnDevice);

    // Делаем функции фокусировки доступными глобально
    window.focusOnDevice = focusOnDevice;
    window.focusOnDeviceByHex = focusOnDeviceByHex;

    watch(devices, (newDevices) => {
      map.geoObjects?.removeAll();
      pointsOnMap.value = 0;
      filteredDevicesCache.value.clear();
      renderSelfBallon(false);
      debouncedRenderBallons(newDevices, false, null, null);
      renderPath(openedNodeId);

      // Вызываем onBoundsChange при изменении данных об устройствах
      if (newDevices && Object.keys(newDevices).length > 0) {
        setTimeout(() => {
          onBoundsChange();
        }, 150);
      }
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
/* Основные стили для карты */
#map {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  position: relative;
  overflow: hidden;
}

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

.close-history-button {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
  border: none;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  user-select: none;

  &:hover {
    transform: translateX(-50%) translateY(-2px);
    box-shadow: 0 6px 16px rgba(255, 107, 53, 0.5);
    background: linear-gradient(135deg, #f7931e 0%, #ff6b35 100%);
  }

  &:active {
    transform: translateX(-50%) translateY(0px);
    box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);
  }

  svg {
    width: 16px;
    height: 16px;
  }
}
</style>
