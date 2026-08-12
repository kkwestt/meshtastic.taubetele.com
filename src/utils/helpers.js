import { TIME_INTERVALS } from "./constants.js";

export function timeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return `${seconds} сек назад`;
  } else if (minutes < 60) {
    return `${minutes} мин назад`;
  } else if (hours < 24) {
    return `${hours} ч назад`;
  } else {
    return `${days} д назад`;
  }
}

export function isDeviceOnline(device) {
  const now = Date.now();
  const latestTimestamp = getLatestDeviceTimestamp(device);

  if (!latestTimestamp) return false;

  const diffSeconds = (now - latestTimestamp * 1000) / 1000;
  return diffSeconds < TIME_INTERVALS.DEVICE_ACTIVE_THRESHOLD;
}

export function isDeviceActive(device) {
  const now = Date.now();
  const latestTimestamp = getLatestDeviceTimestamp(device);

  if (!latestTimestamp) return false;

  const diffSeconds = (now - latestTimestamp * 1000) / 1000;
  return diffSeconds < TIME_INTERVALS.DEVICE_ACTIVE_THRESHOLD;
}

export function isDeviceRecentlyActive(device) {
  const now = Date.now();
  const latestTimestamp = getLatestDeviceTimestamp(device);

  if (!latestTimestamp) return false;

  const diffSeconds = (now - latestTimestamp * 1000) / 1000;
  return diffSeconds < TIME_INTERVALS.DEVICE_RECENTLY_ACTIVE_THRESHOLD;
}

export function isMqttNode(device) {
  if (device?.gateway && device?.hex_id) {
    return device.gateway === device.hex_id;
  }

  return device?.user?.rxSnr === 0 && device?.user?.rxRssi === 0;
}

export function getNodeId(device) {
  const nodeId = device?.device_id || device?.hex_id || device?.user?.data?.id;

  if (nodeId) {
    return nodeId;
  }

  if (device?.latitude && device?.longitude) {
    return `node_${device.latitude.toFixed(4)}_${device.longitude.toFixed(4)}`;
  }

  return "unknown";
}

export function getDeviceName(device) {
  if (device?.longName || device?.shortName) {
    return device.longName || device.shortName;
  }

  const deviceName =
    device?.short_name ||
    device?.long_name ||
    device?.hex_id ||
    device?.device_id ||
    device?.user?.data?.shortName ||
    device?.user?.data?.longName ||
    device?.user?.data?.id;

  if (deviceName) {
    return deviceName;
  }
}

export function getDeviceCoordinates(device) {
  if (device?.latitude && device?.longitude) {
    return [device.latitude, device.longitude, 0];
  }

  if (device?.rawData?.latitude_i && device?.rawData?.longitude_i) {
    return [
      device.rawData.latitude_i / 10000,
      device.rawData.longitude_i / 10000,
      device.rawData.altitude || 0,
    ];
  }

  const latitude = device?.position?.data?.latitudeI;
  const longitude = device?.position?.data?.longitudeI;
  const altitude = device?.position?.data?.altitude;

  if (!latitude || !longitude) return null;

  return [latitude / 10000, longitude / 10000, altitude || 0];
}

export function formatValue(value, defaultText = "") {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "undefined" ||
    value === "null" ||
    value === "Unknown" ||
    value === "unknown" ||
    value === "N/A" ||
    value === "n/a"
  ) {
    return defaultText;
  }

  if (typeof value === "string" && value.toLowerCase().includes("n/a")) {
    return defaultText;
  }

  if (typeof value === "number") {
    return value;
  }

  return value;
}

export function isPointInBounds(lat, lng, bounds) {
  if (!bounds) {
    return true;
  }

  if (bounds.getSouthWest && bounds.getNorthEast) {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    if (sw && ne) {
      const inBounds =
        lat >= sw[0] && lat <= ne[0] && lng >= sw[1] && lng <= ne[1];
      return inBounds;
    }
  }

  if (Array.isArray(bounds) && bounds.length === 2) {
    const [[southWest], [northEast]] = bounds;
    const west = bounds[0][1];
    const east = bounds[1][1];

    const inBounds =
      lat >= southWest && lat <= northEast && lng >= west && lng <= east;
    return inBounds;
  }

  return true;
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function getLatestDeviceTimestamp(device) {
  const timestamps = [];

  if (device?.rawData?.time) {
    timestamps.push(device.rawData.time);
  }

  if (device?.last_updated) {
    timestamps.push(device.last_updated / 1000);
  }
  if (device?.position_time) {
    timestamps.push(device.position_time);
  }

  if (device?.user?.serverTime) {
    timestamps.push(device.user.serverTime);
  }
  if (device?.position?.serverTime) {
    timestamps.push(device.position.serverTime);
  }
  if (device?.deviceMetrics?.serverTime) {
    timestamps.push(device.deviceMetrics.serverTime);
  }
  if (device?.environmentMetrics?.serverTime) {
    timestamps.push(device.environmentMetrics.serverTime);
  }

  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}
