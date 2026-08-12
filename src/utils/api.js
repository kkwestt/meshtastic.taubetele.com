import { API_CONFIG } from "./constants.js";

export const meshtasticApi = {
  async getGpsTrack(nodeId) {
    try {
      const response = await fetch(`${API_CONFIG.POSITION_ENDPOINT}:${nodeId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Ошибка получения GPS трека:", error);
      return [];
    }
  },

  async getDeviceMetrics(nodeId) {
    try {
      const response = await fetch(
        `${API_CONFIG.DEVICE_METRICS_ENDPOINT}:${nodeId}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Ошибка получения метрик устройства:", error);
      return null;
    }
  },

  async getNodeInfo(nodeId) {
    try {
      const response = await fetch(`${API_CONFIG.NODEINFO_ENDPOINT}:${nodeId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Ошибка получения информации о узле:", error);
      return null;
    }
  },

  async getPositionInfo(nodeId) {
    try {
      const response = await fetch(`${API_CONFIG.POSITION_ENDPOINT}:${nodeId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Ошибка получения информации о позиции:", error);
      return null;
    }
  },

  async getTelemetryInfo(nodeId) {
    try {
      const response = await fetch(
        `${API_CONFIG.TELEMETRY_ENDPOINT}:${nodeId}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Ошибка получения телеметрии:", error);
      return null;
    }
  },

  // Добавляю новый метод для получения текстовых сообщений
  async getTextMessages(nodeId) {
    try {
      const response = await fetch(
        `${API_CONFIG.TEXT_MESSAGE_ENDPOINT}:${nodeId}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Ошибка получения текстовых сообщений:", error);
      return null;
    }
  },

  // Добавляю новый метод для получения данных MAP_REPORT_APP
  async getMapReportInfo(nodeId) {
    try {
      const response = await fetch(
        `${API_CONFIG.MAP_REPORT_ENDPOINT}:${nodeId}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Ошибка получения данных карты:", error);
      return null;
    }
  },

  // Добавляю новый метод для получения данных TRACEROUTE_APP
  async getTracerouteInfo(nodeId) {
    try {
      const response = await fetch(
        `${API_CONFIG.TRACEROUTE_APP_ENDPOINT}:${nodeId}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Ошибка получения данных traceroute:", error);
      return null;
    }
  },
};
