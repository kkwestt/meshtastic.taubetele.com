<template>
  <highcharts class="hc" :options="chartOptions" ref="chart"></highcharts>
</template>
<script setup>
import { computed, toRefs } from 'vue';
const props = defineProps({
  series: {
    type: Array,
    required: true,
  },
});

const { series } = toRefs(props);

const chartOptions = computed(() => ({
  chart: {
    type: 'line'
  },
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
      format: '{value}',
    }
  },
  tooltip: {
    crosshairs: true,
    shared: true
  },
  plotOptions: {
    spline: {
      marker: {
        radius: 4
      }
    }
  },
  series: series.value,
}));
</script>
