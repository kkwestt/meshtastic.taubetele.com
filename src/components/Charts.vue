<template>
  <highcharts class="hc" :options="chartOptions" ref="chart"></highcharts>
</template>
<script setup>
import { computed, toRefs } from 'vue';
const props = defineProps({
  type: {
    type: String,
    required: true,
  },
  data: {
    type: Array,
    required: true,
  },
});

const { type, data } = toRefs(props);

const chartValues = {
  temperature: {
    yLabel: '{value}°',
  },
  airUtilTx: {
    yLabel: '{value}',
  },
  batteryLevel: {
    yLabel: '{value}',
  },
  channelUtilization: {
    yLabel: '{value}',
  },
  voltage: {
    yLabel: '{value}',
  },
  barometricPressure: {
    yLabel: '{value}',
  },
  current: {
    yLabel: '{value}',
  },
  gasResistance: {
    yLabel: '{value}',
  },
  relativeHumidity: {
    yLabel: '{value}',
  },
};

const chartOptions = computed(() => ({
  // chart: {
  //   type: 'spline'
  // },
  title: {
    text: '',
  },
  xAxis: {
    type: 'datetime'
  },
  yAxis: {
    title: {
      text: '',
    },
    labels: {
      format: chartValues[type.value].yLabel,
    }
  },
  tooltip: {
    crosshairs: true,
    shared: true
  },
  plotOptions: {
    spline: {
      // dataLabels: { 
      //   enabled: true
      // },
      marker: {
        radius: 4
      //   lineColor: '#666666',
      //   lineWidth: 1
      }
    }
  },
  series: [{
    data: data.value,
  }]
}));
</script>
