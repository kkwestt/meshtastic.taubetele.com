<template>
  <modal
    full-height
    full-width
    title="Charts"
    @close="$emit('close')"
  >
    <div>
      <div v-for="metric in metricsList">
        <div class="tab-title">
          {{ titles[metric] }}
        </div>
        <div class="tabs">
          <button
            type="button"
            class="tab"
            :class="{ active: item === type }"
            v-for="item in metrics[metric]"
            @click="handleTabClick(item)"
          >
            {{ titles[item] }}
          </button>
        </div>
      </div>
    </div>
    <charts
      :type="type"
      :data="chartData"
    />
  </modal>
</template>
<script setup>
import { onMounted, toRefs, ref, computed } from "vue";
import Modal from './Modal.vue';
import Charts from './Charts.vue';

const props = defineProps({
  nodeId: {
    type: String,
    required: true,
  }
});

const titles = {
  device: 'Device',
  airUtilTx: 'Air Util Tx',
  batteryLevel: 'Battery Level',
  channelUtilization: 'Channel Utilization',
  voltage: 'Battery Voltage',
  environment: 'Environment',
  barometricPressure: 'Barometric Pressure',
  current: 'Current',
  gasResistance: 'Gas Resistance (AQI)',
  relativeHumidity: 'Relative Humidity',
  temperature: 'Temperature',
};

const metrics = {
  device: [ 'batteryLevel', 'voltage', 'channelUtilization', 'airUtilTx' ],
  environment: ['temperature', 'relativeHumidity', 'barometricPressure',  'gasResistance', 'current' ],
};

const metricsList = Object.keys(metrics);

const data = ref(null);
const type = ref('temperature');

const { nodeId } = toRefs(props);

const handleTabClick = (tab) => {
  type.value = tab;
};

const chartData = computed(() => {
  if (!data.value) {
    return [];
  }


  const metricType = metrics.device.includes(type.value)
    ? 'device'
    : 'environment';

  return data.value[metricType].map((item) => ({
    x: item.time,
    y: item[type.value],
  }));
});

const fetcData = async () => {
  try {
    const [responseDeviceMetrics, responseEnvironmentMetrics] = await Promise.all([
      fetch(`/deviceMetrics:${nodeId.value}`),
      fetch(`/environmentMetrics:${nodeId.value}`),
    ]);

    const deviceMetrics = await responseDeviceMetrics.json();
    const environmentMetrics = await responseEnvironmentMetrics.json();
    data.value = {
      device: deviceMetrics.data,
      environment: environmentMetrics.data,
    };
  } catch (error) {
    console.error(error);
  }
}

onMounted(() => {
  fetcData();
});
</script>
<style lang="scss">
.tab-title {
  margin-bottom: 10px;
  text-transform: uppercase;
  font-size: 14px;
}

.tab {
  border: thin solid #B6D094;
  padding: 0px 7px;
  border-radius: 10px;
  margin-bottom: 10px;

  & + & {
    margin-left: 10px;
  }

  &:hover {
    color: #B6D094;
  }

  &.active {
    color: #fff;
    background-color: #B6D094;
  }
}
</style>
