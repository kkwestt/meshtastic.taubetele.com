<template>
  <div class="search-modal-overlay" @click="handleOverlayClick">
    <div class="search-modal" @click.stop>
      <div class="search-modal-header">
        <h2>🔍 Поиск устройств</h2>
        <button class="close-button" @click="$emit('close')">×</button>
      </div>

      <div class="search-input-container">
        <input
          v-model="searchQuery"
          @input="handleSearch"
          @keyup.enter="performSearch"
          type="text"
          placeholder="Поиск по ID, hex ID, long name, short name..."
          class="search-input"
        />
        <button @click="performSearch" class="search-button">🔍</button>
      </div>

      <div class="search-results" v-if="searchResults.length > 0">
        <div class="results-header">
          <h3>Результаты поиска ({{ searchResults.length }})</h3>
          <button @click="clearResults" class="clear-button">Очистить</button>
        </div>

        <div class="results-list">
          <div
            v-for="result in searchResults"
            :key="getDeviceKey(result.device)"
            class="device-item"
            @click="selectDevice(result.device, result.deviceKey)"
          >
            <div class="device-header">
              <span class="device-name">{{
                getDeviceName(result.device)
              }}</span>
              <span class="device-short">{{
                getDeviceShortName(result.device)
              }}</span>
            </div>
            <div class="device-details">
              <span class="device-time">{{
                formatTime(result.device.s_time)
              }}</span>
            </div>
            <!-- Debug section removed -->

            <div class="device-location" v-if="hasValidLocation(result.device)">
              📍 {{ formatCoordinate(result.device.latitude) }},
              {{ formatCoordinate(result.device.longitude) }}
            </div>
          </div>
        </div>
      </div>

      <div class="no-results" v-else-if="hasSearched && searchQuery.length > 0">
        <p>🔍 Устройства не найдены</p>
        <p class="search-tip">
          Попробуйте изменить запрос или использовать другие параметры
        </p>
      </div>

      <div class="search-tips" v-if="!hasSearched">
        <h3>💡 Подсказки по поиску:</h3>
        <ul>
          <li><strong>ID:</strong> 12345678</li>
          <li><strong>Hex ID:</strong> 01ab2455</li>
          <li><strong>Long Name:</strong> LONGNAME</li>
          <li><strong>Short Name:</strong> NAME</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const emit = defineEmits(["close", "selectDevice"]);

const searchQuery = ref("");
const searchResults = ref([]);
const hasSearched = ref(false);

// Получаем устройства из родительского компонента
const props = defineProps({
  devices: {
    type: Object,
    required: true,
  },
});

const handleSearch = () => {
  if (searchQuery.value.length < 2) {
    searchResults.value = [];
    hasSearched.value = false;
    return;
  }

  performSearch();
};

const performSearch = () => {
  if (searchQuery.value.length < 2) return;

  const query = searchQuery.value.toLowerCase();
  const results = [];

  // Поиск по всем устройствам
  for (const deviceId in props.devices) {
    const device = props.devices[deviceId];

    // Проверяем, что устройство существует и является объектом
    if (!device || typeof device !== "object") {
      continue;
    }

    try {
      // Поиск по ID (числовой)
      if (device.device_id && device.device_id.toString().includes(query)) {
        results.push({ device, deviceKey: deviceId });
        continue;
      }

      // Поиск по hex ID
      if (device.hex_id && device.hex_id.toLowerCase().includes(query)) {
        results.push({ device, deviceKey: deviceId });
        continue;
      }

      // Поиск по hex ID без префикса !
      if (
        device.hex_id &&
        device.hex_id.toLowerCase().replace("!", "").includes(query)
      ) {
        results.push({ device, deviceKey: deviceId });
        continue;
      }

      // Поиск по числовому ID (ключ объекта) в hex формате
      try {
        const deviceIdHex = parseInt(deviceId).toString(16);
        if (deviceIdHex.includes(query.toLowerCase())) {
          results.push({ device, deviceKey: deviceId });
          continue;
        }
      } catch (e) {
        // Игнорируем ошибки конвертации
      }

      // Поиск по числовому ID в десятичном формате, если запрос - hex
      if (/^[0-9a-f]+$/i.test(query)) {
        try {
          const queryDecimal = parseInt(query, 16);
          if (
            deviceId == queryDecimal ||
            device.device_id == queryDecimal ||
            device.id == queryDecimal
          ) {
            results.push({ device, deviceKey: deviceId });
            continue;
          }
        } catch (e) {
          // Игнорируем ошибки конвертации
        }
      }

      // Поиск по long name
      if (
        device.longName &&
        typeof device.longName === "string" &&
        device.longName.toLowerCase().includes(query)
      ) {
        results.push({ device, deviceKey: deviceId });
        continue;
      }

      // Поиск по short name
      if (
        device.shortName &&
        typeof device.shortName === "string" &&
        device.shortName.toLowerCase().includes(query)
      ) {
        results.push({ device, deviceKey: deviceId });
        continue;
      }

      // Поиск по альтернативным полям
      if (
        device.long_name &&
        typeof device.long_name === "string" &&
        device.long_name.toLowerCase().includes(query)
      ) {
        results.push({ device, deviceKey: deviceId });
        continue;
      }

      if (
        device.short_name &&
        typeof device.short_name === "string" &&
        device.short_name.toLowerCase().includes(query)
      ) {
        results.push({ device, deviceKey: deviceId });
        continue;
      }

      if (device.id && device.id.toString().includes(query)) {
        results.push({ device, deviceKey: deviceId });
        continue;
      }

      // Дополнительный поиск по всем строковым полям
      for (const [key, value] of Object.entries(device)) {
        if (typeof value === "string" && value.toLowerCase().includes(query)) {
          results.push({ device, deviceKey: deviceId });
          break;
        }
      }
    } catch (error) {
      console.warn("Ошибка при поиске по устройству:", deviceId, error);
      continue;
    }
  }

  searchResults.value = results;
  hasSearched.value = true;
};

const clearResults = () => {
  searchResults.value = [];
  hasSearched.value = false;
  searchQuery.value = "";
};

const selectDevice = (device, deviceKey) => {
  // Проверяем, есть ли у устройства валидные координаты
  if (hasValidLocation(device)) {
    const coordinates = {
      latitude: Number(device.latitude),
      longitude: Number(device.longitude),
      device: device,
      deviceKey: deviceKey, // Передаем ключ устройства
    };

    emit("selectDevice", coordinates);
  } else {
    // Если нет координат, все равно передаем устройство для возможного отображения информации

    emit("selectDevice", { device: device, deviceKey: deviceKey });
  }
  emit("close");
};

const handleOverlayClick = () => {
  emit("close");
};

// Вспомогательные функции для безопасного получения свойств устройства
const getDeviceKey = (device) => {
  return device?.device_id || device?.hex_id || device?.id || "unknown";
};

const getDeviceName = (device) => {
  return device?.longName || device?.long_name || "Без имени";
};

const getDeviceShortName = (device) => {
  return device?.shortName || device?.short_name || "Без короткого имени";
};

const getDeviceId = (device) => {
  // Сначала проверяем стандартные поля
  if (device?.device_id) {
    return `ID: ${device.device_id}`;
  }
  if (device?.hex_id) {
    return `Hex: ${device.hex_id}`;
  }
  if (device?.id) {
    return `ID: ${device.id}`;
  }

  // Если стандартные поля не найдены, возвращаем "Неизвестно"

  return "Неизвестно";
};

const hasValidLocation = (device) => {
  return (
    device?.latitude &&
    device?.longitude &&
    !isNaN(device.latitude) &&
    !isNaN(device.longitude)
  );
};

const formatCoordinate = (coord) => {
  if (!coord || isNaN(coord)) return "0.0000";
  return Number(coord).toFixed(4);
};

const formatTime = (timestamp) => {
  try {
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
  } catch (error) {
    return "Неизвестно";
  }
};
</script>

<style lang="scss" scoped>
.search-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.search-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.search-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      background: #e5e7eb;
      color: #374151;
    }
  }
}

.search-input-container {
  display: flex;
  padding: 20px 24px;
  gap: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }

  &::placeholder {
    color: #9ca3af;
  }
}

.search-button {
  padding: 12px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: #2563eb;
  }
}

.search-results {
  padding: 20px 24px;
  max-height: 400px;
  overflow-y: auto;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #1f2937;
  }

  .clear-button {
    padding: 6px 12px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #e5e7eb;
    }
  }
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-item {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3b82f6;
    background: #f8fafc;
  }
}

.device-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  .device-name {
    font-weight: 600;
    color: #1f2937;
    font-size: 1rem;
  }

  .device-short {
    font-weight: 500;
    color: #6b7280;
    font-size: 0.875rem;
    background: #f3f4f6;
    padding: 2px 8px;
    border-radius: 4px;
  }
}

.device-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.875rem;

  .device-id {
    color: #374151;
    font-family: monospace;
  }

  .device-time {
    color: #6b7280;
  }
}

.device-location {
  font-size: 0.875rem;
  color: #059669;
  font-weight: 500;
}

.no-results {
  padding: 40px 24px;
  text-align: center;
  color: #6b7280;

  p {
    margin: 8px 0;
  }

  .search-tip {
    font-size: 0.875rem;
    color: #9ca3af;
  }
}

.search-tips {
  padding: 20px 24px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;

  h3 {
    margin: 0 0 12px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
  }

  ul {
    margin: 0;
    padding-left: 20px;
    color: #6b7280;
    font-size: 0.875rem;

    li {
      margin-bottom: 6px;
      line-height: 1.4;
    }
  }
}
</style>
