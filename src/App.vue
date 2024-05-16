<template>
  <dots-map
    @infoOpen="handleInfoOpen"
    @tableOpen="handleTableOpen"
    @chartOpen="handleChartOpen"
    :devices="devices"
  />
  <modal v-if="shouldShowInfoModal" title="Info" @close="handleInfoClose">
    <div v-if="!devices">Loading...</div>
    <div v-else>
      <p>
        Meshtastic – оперативно-тактический радиочат без сотовой связи и
        интернета. Этот проект, который позволяет использовать недорогие
        радиомодемы стандарта LoRa в качестве автономного коммуникатора дальнего
        действия для районов, где нет надежной сотовой связи. Эти радиомодемы
        могут быть использованы, например, для пеших прогулок, катания на лыжах,
        парапланеризма — практически любого хобби, в местности, где нет хорошей
        связи. Каждый абонент может отправлять и просматривать текстовые
        сообщения, включать дополнительные функции определения местоположения на
        основе GPS.
      </p>
      <br />
      <p>
        Данная карта отображает публичные устройства, входяцие в данную
        радиосеть. Для того чтобы они появились тут вы можете включить MQTT на
        своей ноде или добраться до ближайшей сети, в которой есть уже подключенные участники.
      </p>
      <br>
      <table aligne=center width="100%">
        <tr>
          <th colspan="2">Условные обозначения</th>
        </tr>
        <tr>
          <td><img src=/blueStr.png></td>
          <td> нода в сети, последнее сообщение пришло менее часа назад </td>
        </tr>
        <tr>
          <td><img src=/nightStr.png></td>
          <td> нода в сети и подключена к MQTT, последнее сообщение пришло менее часа назад </td>
        </tr>
        <tr>
          <td><img src=/grayStr.png></td>
          <td> нода не в сети,  последнее сообщение пришло более часа назад </td>
        </tr>
      </table>
    </div>
    <template v-slot:footer> This is a new modal footer. </template>
  </modal>

  <modal
    v-if="shouldShowTableModal"
    title="ALL DEVICES LIST"
    @close="handleTableClose"
  >
  <div v-if="!devices">Loading...</div>
  <div v-else>
    <div class="px-3 mt-3 mb-1">
          <input v-model="filter" class="w-full border p-1.5 hover:outline-none focus:outline-none" placeholder="Filter by shortName/longName/server/id" />
    </div>
    <div class="p-3 transition-colors hover:bg-neutral-100" v-for="device in filtered" :key="device">
          <div class="cursor-pointer select-none" >
            <div class="text-xl flex gap-1.5 cursor-pointer" @click="devices[device].opened = !devices[device].opened">
              <span :class="(Math.round(Date.now() / 1000) - devices[device].timestamp) > 3600 ? 'text-neutral-500' : 'text-blue-600'">
                <span v-if="devices[device]?.user?.data?.longName">{{ devices[device]?.user?.data?.longName }}</span>
                <span v-else>{{ device }}</span>
              </span>
          </div>
            <div v-if="((Math.round(Date.now() / 1000) - devices[device].timestamp) > 3600)" @click="addToFilter(devices[device].user?.data?.longName)"> Last heard: {{new Date(devices[device].timestamp * 1000).toLocaleString()}} </div>
            <!-- <div v-else>{{ timeAgo(new Date(devices[device].timestamp * 1000).getTime()) }}</div> -->
          </div>
          <div v-if="devices[device].opened">
            <table>
              <tbody>
                <tr>
                  <td>MQTT Server</td>
                  <td><div @click="addToFilter(devices[device].server)" class="p-1 text-sm text-blue-500 cursor-pointer w-fit">{{ devices[device].server }}</div></td>
              </tr>
                  <tr v-if="devices[device]?.user?.data?.shortName">
                  <td>Short name</td>
                  <td>{{ devices[device].user.data.shortName }}</td>
                </tr>
                <tr v-if="devices[device]?.user?.data?.hwModel">
                  <td>Hardware</td>
                  <td>{{ devices[device].user.data.hwModel }}</td>
                </tr>
                <tr v-if="devices[device]?.user?.data?.id">
                  <td>ID</td>
                  <td>{{ devices[device].user.data.id }} 
                    ({{ (devices[device]?.position?.from) ? devices[device]?.position?.from : devices[device]?.deviceMetrics?.from }})</td>
                </tr>
                <tr v-if="devices[device]?.position?.data?.latitudeI">
                  <td>Position </td>
                  <td>{{ Number(devices[device].position.data.latitudeI / 10000000).toFixed(4) }}, {{ Number(devices[device].position.data.longitudeI / 10000000).toFixed(4) }}</td>
                </tr>
                <tr v-if="devices[device]?.position?.data?.altitude">
                  <td>Altitude</td>
                  <td>{{ devices[device].position.data.altitude }} m</td>
                </tr>
                <tr v-if="devices[device]?.position?.data?.satsInView">
                  <td>Sat's In View</td>
                  <td>{{ devices[device].position.data.satsInView }} sat's</td>
                </tr>
                <tr v-if="devices[device]?.user?.hopLimit">
                  <td>User Hop Limit</td>
                  <td> {{ devices[device].user.hopLimit }}</td>
                </tr>
                <tr v-if="devices[device]?.position?.hopLimit">
                  <td>Position Hop Limit</td>
                  <td>{{ devices[device].position.hopLimit }}</td>
                </tr>
                <tr v-if="devices[device]?.deviceMetrics?.hopLimit">
                  <td>Telemetry Hop Limit</td>
                  <td>{{ devices[device].deviceMetrics.hopLimit }}</td>
                </tr>
                <tr v-if="devices[device]?.user?.rxSnr">
                  <td>RX SNR</td>
                  <td>{{ devices[device].user.rxSnr }} <br> уровень сигнала с которым пришел пакет nodeinfo</td>
                </tr>
                <tr v-if="devices[device]?.user?.rxRssi">
                  <td>RX RSSI</td>
                  <td>{{ devices[device].user.rxRssi }} <br> уровень сигнала с которым пришел пакет nodeinfo</td>
                </tr>
                <tr v-if="devices[device]?.deviceMetrics?.data?.deviceMetrics?.airUtilTx">
                  <td>Air util tx</td>
                  <td>{{ Number(devices[device].deviceMetrics.data.deviceMetrics.airUtilTx).toFixed(1) }} %</td>
                </tr>
                <tr v-if="devices[device]?.deviceMetrics?.data?.deviceMetrics?.channelUtilization">
                  <td>Channel utilization</td>
                  <td>{{ Number(devices[device].deviceMetrics.data.deviceMetrics.channelUtilization).toFixed(1) }} %</td>
                </tr>
                <tr v-if="devices[device]?.user?.channel >= 0">
                  <td>Lora channel</td>
                  <td>{{ devices[device].user.channel }}</td>
                </tr>
                <tr v-if="devices[device]?.deviceMetrics?.data?.deviceMetrics?.voltage">
                  <td>Battery voltage</td>
                  <td>{{ Number(devices[device]?.deviceMetrics?.data?.deviceMetrics?.voltage).toFixed(2) }} V</td>
                </tr>
                <tr v-if="devices[device]?.deviceMetrics?.data?.deviceMetrics?.batteryLevel">
                  <td>Battery level</td>
                  <td>{{ (devices[device].deviceMetrics.data.deviceMetrics.batteryLevel > 100) ? 100 : (Math.round(devices[device].deviceMetrics.data.deviceMetrics.batteryLevel))  }} %</td>
                </tr>
                <tr v-if="devices[device]?.environmentMetrics?.data?.deviceMetrics?.barometricPressure">
                  <td>Barometric pressure</td>
                  <td>{{ Math.round(devices[device].environmentMetrics.data.environmentMetrics.barometricPressure) }} hPa</td>
                </tr>
                <tr v-if="devices[device]?.environmentMetrics?.data?.environmentMetrics?.current">
                  <td>Current</td>
                  <td>{{ devices[device].environmentMetrics.data.environmentMetrics.current }}</td>
                </tr>
                <tr v-if="devices[device]?.environmentMetrics?.data?.environmentMetrics?.voltage">
                  <td>Voltage</td>
                  <td>{{ devices[device].environmentMetrics.data.environmentMetrics.voltage }}</td>
                </tr>
                <tr v-if="devices[device]?.environmentMetrics?.data?.environmentMetrics?.gasResistance">
                  <td>Gas</td>
                  <td>{{ Number(devices[device].environmentMetrics.data.environmentMetrics.gasResistance).toFixed(0) }} MOhms</td>
                </tr>
                <tr v-if="devices[device]?.environmentMetrics?.data?.environmentMetrics?.relativeHumidity">
                  <td>Humidity</td>
                  <td>{{ Number(devices[device].environmentMetrics.data.environmentMetrics.relativeHumidity).toFixed(0) }} %</td>
                </tr>
                <tr v-if="devices[device]?.environmentMetrics?.data?.environmentMetrics?.temperature">
                  <td>Temperature</td>
                  <td>{{ Number(devices[device].environmentMetrics.data.environmentMetrics.temperature).toFixed(1) }} ℃</td>
                </tr>
                 <tr v-if="devices[device]?.mqtt">
                  <td><div class="font-bold">MQTT: </div></td> <td><div class="font-bold">Online</div></td>
                </tr>
                <tr v-if="devices[device]?.mqtt">
                  <td>Server: </td> <td>{{devices[device]?.server}}</td>
                </tr>
                <tr v-if="devices[device]?.text?.data || devices[device]?.message?.data">
                  <td>Last public message: </td> <td>{{devices[device]?.message?.data }} </td>
                </tr>
                </tbody>
            </table>
          </div>
        </div>
  </div>
  </modal>

  <charts-modal
    v-if="shouldShowChartsModal"
    :maxWidth=900
    :nodeId="chosenNodeId"
    @close="handleChartsModalClose"
  />

</template>
<script setup>
import { ref, onMounted, computed, shallowRef } from "vue";

import Modal from "./components/Modal.vue";
import DotsMap from "./components/map/DotsMap.vue";
import ChartsModal from "./components/ChartsModal.vue";

const devices = ref();
const chosenNodeId = ref();

const shouldShowChartsModal = computed(() => Boolean(chosenNodeId.value));

const handleChartsModalClose = () => {
  chosenNodeId.value = null;
}

const fetchDevices = () =>
  fetch("/api")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((json) => {
      const names = Object.keys(json);
      names.forEach((name) => {
        json[name].timestamp = new Date(json[name].timestamp).getTime() / 1000;
      });
      devices.value = json; 
    })
    .catch(() => {
      console.log("cannot fetch");
    });

onMounted(async () => { 
  await fetchDevices();

  setInterval(() => {
    fetchDevices();
  }, 20000);
});

const handleChartOpen = (nodeId) => {
  chosenNodeId.value = nodeId;
};

/////////// filter
const filter = shallowRef('')

const addToFilter = (item) => {
  filter.value = item
}
const filtered = computed(() => {
  if (!filter.value) {
    return Object.keys(devices.value)
  }
  else {
    const candidates = {} 
    const needle = filter.value.toLowerCase()
    for (const candidate in devices.value) {
      // console.log(
        // devices.value[candidate].server,
        // devices.value[candidate]?.user?.data?.shortName,
        // devices.value[candidate]?.user?.data?.longName,
        // devices.value[candidate]?.user?.data?.id
      // )
      if (devices.value[candidate].server.match(needle)) {
        candidates[candidate] = devices.value[candidate]
      }
      else if (devices.value[candidate]?.user?.data?.shortName.toLowerCase().match(needle)) {
        candidates[candidate] = devices.value[candidate]
      }
      else if (devices.value[candidate]?.user?.data?.longName.toLowerCase().match(needle)) {
        candidates[candidate] = devices.value[candidate]
      }
      else if (devices.value[candidate]?.user?.data?.id.toLowerCase().match(needle)) {
        candidates[candidate] = devices.value[candidate]
      }
    }
    return Object.keys(candidates)
  }
})


const shouldShowInfoModal = ref(false);

const handleInfoOpen = () => {
  shouldShowInfoModal.value = true;
};

const handleInfoClose = () => {
  shouldShowInfoModal.value = false;
};

const shouldShowTableModal = ref(false);

const handleTableOpen = () => {
  shouldShowTableModal.value = true;
};

const handleTableClose = () => {
  shouldShowTableModal.value = false;
};
</script>
