<template>
  <dots-map
    @infoOpen="handleInfoOpen"
    @tableOpen="handleTableOpen"
    @chartOpen="handleChartOpen"
    :center="mapCenter"
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
      </table><br>
      <p>
         Каждая нода может слать следующие типы сообщений: NodeInfo, Device Metrics, Environment Metrics (данные датчиков), Position, Message, Ping. Все сообщения приходят в разное время, а могут вообще не приходить, поэтому них есть время последнего сообщения, HopLimit, rssi/snr итд.
      </p><br>
      <p>
        Сервис пытается собирать данные и рисовать по ним графики. Сейчас собирается только 1000 последних сообщений. 
      </p>
    </div>
    <template v-slot:footer> This is a new modal footer. ?</template>
  </modal>

  <modal
    v-if="shouldShowTableModal"
    title="ALL DEVICES LIST"
    full-height
    full-width
    @close="handleTableClose"
  >
  <div v-if="!devices">Loading...</div>
  <div v-else>
    <div class="px-3 mt-3 pb-1 filter-wrapper">
      <input v-model="filter" class="w-full border p-1.5 hover:outline-none focus:outline-none" placeholder="Filter by shortName/longName/server/id" />
    </div>
    <div class="p-3 transition-colors hover:bg-neutral-100" v-for="device in filtered" :key="device">
          <div class="cursor-pointer select-none" >
            <div class="text-xl flex gap-1.5 cursor-pointer" @click="devices[device].opened = !devices[device].opened">
              <span :class="(Math.round(Date.now() / 1000) - devices[device].timestamp) > 3600 ? 'text-neutral-500' : 'text-blue-600'">
                <span v-if="devices[device]?.user?.data?.longName ||
                            devices[device]?.position?.from ||
                            devices[device]?.deviceMetrics?.from ||
                            devices[device]?.environmentMetrics?.from">{{ devices[device]?.user?.data?.longName ||
                                                                          devices[device]?.position?.from ||
                                                                          devices[device]?.deviceMetrics?.from ||
                                                                          devices[device]?.environmentMetrics?.from }}</span>
                <span v-else>{{ device }} </span>
              </span>
              <button
                class="chart-button"
                type="button"
                v-if="devices[device]?.position?.from"
                :data-node-id="
                  devices[device]?.user?.from ||
                  devices[device]?.position?.from ||
                  devices[device]?.deviceMetrics?.from ||
                  devices[device]?.message?.from ||
                  devices[device]?.routing?.from"
                @click="handleChartButtonClick"
              ><svg xmlns="http://www.w3.org/2000/svg" height="1.4em" viewBox="0 0 448 512"><path d="M160 80c0-26.5 21.5-48 48-48h32c26.5 0 48 21.5 48 48V432c0 26.5-21.5 48-48 48H208c-26.5 0-48-21.5-48-48V80zM0 272c0-26.5 21.5-48 48-48H80c26.5 0 48 21.5 48 48V432c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V272zM368 96h32c26.5 0 48 21.5 48 48V432c0 26.5-21.5 48-48 48H368c-26.5 0-48-21.5-48-48V144c0-26.5 21.5-48 48-48z" fill="currentColor" /></svg></button>
              
              <button 
                type="button"
                v-if="devices[device]?.position?.from"
                :data-latitude="devices[device]?.position?.data?.latitudeI / 10000000"
                :data-longitude="devices[device]?.position?.data?.longitudeI / 10000000"
                @click="handleLocationClick"
              ><svg height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.992,9.98A8.991,8.991,0,0,0,3.01,9.932a13.95,13.95,0,0,0,8.574,12.979A1,1,0,0,0,12,23a1.012,1.012,0,0,0,.419-.09A13.948,13.948,0,0,0,20.992,9.98ZM12,20.9A11.713,11.713,0,0,1,5.008,10a6.992,6.992,0,1,1,13.984,0c0,.021,0,.045,0,.065A11.7,11.7,0,0,1,12,20.9ZM14,10a2,2,0,1,1-2-2A2,2,0,0,1,14,10Z"/></svg></button>
            </div>
            <div v-if="((Math.round(Date.now() / 1000) - devices[device].timestamp) > 3600)" @click="addToFilter(devices[device].user?.data?.longName)" class="text-neutral-500 text-s "> Last heard: {{new Date(devices[device].timestamp * 1000).toLocaleString()}} </div>
            <div v-else>{{ timeAgo(new Date(devices[device].timestamp * 1000).getTime()) }}</div>
          </div>
          <div v-if="devices[device].opened">
            &nbsp;
            <ul>
              <dl v-if="devices[device]?.user?.from || 
                        devices[device]?.position?.from ||
                        devices[device]?.deviceMetrics?.from ||
                        devices[device]?.environmentMetrics?.from"><b>Node Info:</b> <i>{{ timeAgo(new Date(Date.parse(devices[device]?.user?.rxTime)).getTime() || 0) }}</i></dl>
              <ul>
              <li v-if="devices[device]?.user?.data?.shortName"> Short Name: <b> {{devices[device]?.user?.data?.shortName}}</b> </li>
              <li v-if="devices[device]?.user?.data?.longName"> Long Name: <b> {{devices[device]?.user?.data?.longName}}</b> </li>
              <li v-if="devices[device]?.user?.data?.id"> ID: <b> {{devices[device]?.user?.data?.id}}</b> </li>
              <li v-if="devices[device]?.user?.from || 
                        devices[device]?.position?.from ||
                        devices[device]?.deviceMetrics?.from ||
                        devices[device]?.environmentMetrics?.from "> ID From: <b> {{ devices[device]?.user?.from || 
                                                                          devices[device]?.position?.from || 
                                                                          devices[device]?.deviceMetrics?.from ||
                                                                          devices[device]?.environmentMetrics?.from }}</b> </li>
              <li v-if="devices[device]?.user?.data?.hwModel"> Hardware Model: <b> {{devices[device]?.user?.data?.hwModel}}</b> </li>
              <li v-if="devices[device]?.user?.data?.role"> Role: <b> {{devices[device]?.user?.data?.role}}</b> </li>
              <!-- <li v-if="devices[device]?.user?.data?.macaddr"> Mac Addr: <b> {{devices[device]?.user?.data?.macaddr}}</b> </li> -->
              <li v-if="devices[device]?.user?.data?.isLicensed"> Is Licensed?: <b> {{devices[device]?.user?.data?.isLicensed}}</b> </li> 
              </ul>

              <dl v-if="devices[device]?.position?.from"><hr><b> Position </b> <i>{{ timeAgo(new Date(devices[device]?.position?.data?.time * 1000).getTime()) }}</i></dl>
              <ul v-if="devices[device]?.position?.from">
                <li v-if="devices[device]?.position?.rxRssi"> rxRssi: <b> {{devices[device]?.position?.rxRssi}}</b> </li>
                <li v-if="devices[device]?.position?.rxSnr"> rxSnr: <b> {{devices[device]?.position?.rxSnr}}</b> </li>
                <li v-if="devices[device]?.position?.hopLimit"> Hop: <b> {{devices[device]?.position?.hopLimit}}</b> </li>
                <li v-if="devices[device]?.position?.data?.latitudeI"> Latitude: <b> {{devices[device]?.position?.data?.latitudeI/10000000}}</b> </li>
                <li v-if="devices[device]?.position?.data?.longitudeI"> Longitude: <b> {{devices[device]?.position?.data?.longitudeI/10000000}}</b> </li>
                <li v-if="devices[device]?.position?.data?.altitude"> Altitude: <b> {{devices[device]?.position?.data?.altitude}}</b> </li>
                <li v-if="devices[device]?.position?.data?.satsInView"> Sats In View: <b> {{devices[device]?.position?.data?.satsInView}}</b> </li>
                <li v-if="devices[device]?.position?.data?.seqNumber"> Seq Number: <b> {{devices[device]?.position?.data?.seqNumber}}</b> </li>
                <li v-if="devices[device]?.position?.data?.groundSpeed"> Ground Speed: <b> {{devices[device]?.position?.data?.groundSpeed}}</b> </li>
              </ul>
            
              <dl v-if="devices[device]?.deviceMetrics?.from"><hr><b> Device Metrics </b> <i>{{ timeAgo(new Date(devices[device]?.deviceMetrics?.data?.time * 1000).getTime())}}</i></dl>
              <ul v-if="devices[device]?.deviceMetrics?.from">
                <li v-if="devices[device]?.deviceMetrics?.rxRssi"> rxRssi: <b> {{devices[device]?.deviceMetrics?.rxRssi}}</b> </li>
                <li v-if="devices[device]?.deviceMetrics?.rxSnr"> rxSnr: <b> {{devices[device]?.deviceMetrics?.rxSnr}}</b> </li>
                <li v-if="devices[device]?.deviceMetrics?.hopLimit"> Hop: <b> {{devices[device]?.deviceMetrics?.hopLimit}}</b> </li>
                <li v-if="devices[device]?.deviceMetrics?.data?.deviceMetrics?.batteryLevel"> Battery Level: <b> {{(devices[device].deviceMetrics.data.deviceMetrics.batteryLevel > 100) ? 100 : (Math.round(devices[device].deviceMetrics.data.deviceMetrics.batteryLevel)) }}</b> </li>
                <li v-if="devices[device]?.deviceMetrics?.data?.deviceMetrics?.voltage"> Battery Voltage: <b> {{Number(devices[device]?.deviceMetrics?.data?.deviceMetrics?.voltage).toFixed(2)}}</b> </li>
                <li v-if="devices[device]?.deviceMetrics?.data?.deviceMetrics?.channelUtilization"> Channel Utilization: <b> {{Number(devices[device]?.deviceMetrics?.data?.deviceMetrics?.channelUtilization).toFixed(1)}}</b> </li>
                <li v-if="devices[device]?.deviceMetrics?.data?.deviceMetrics?.airUtilTx"> Air Util Tx: <b> {{Number(devices[device]?.deviceMetrics?.data?.deviceMetrics?.airUtilTx).toFixed(1)}}</b> </li>
              </ul>

              <dl v-if="devices[device]?.environmentMetrics?.from"><hr><b>Environment Metrics</b> <i>{{ timeAgo(new Date(devices[device]?.environmentMetrics?.data?.time * 1000).getTime()) }}</i></dl>
              <ul v-if="devices[device]?.environmentMetrics?.from">
                <li v-if="devices[device]?.environmentMetrics?.rxRssi"> rxRssi: <b> {{devices[device]?.environmentMetrics?.rxRssi}}</b> </li>
                <li v-if="devices[device]?.environmentMetrics?.rxSnr"> rxSnr: <b> {{devices[device]?.environmentMetrics?.rxSnr}}</b> </li>
                <li v-if="devices[device]?.environmentMetrics?.hopLimit"> Hop: <b> {{devices[device]?.deviceMetrics?.hopLimit}}</b> </li>
                <li v-if="devices[device]?.environmentMetrics?.data?.environmentMetrics?.temperature"> Temperature: <b> {{Number(devices[device]?.environmentMetrics?.data?.environmentMetrics?.temperature).toFixed(1)}}</b> </li>
                <li v-if="devices[device]?.environmentMetrics?.data?.environmentMetrics?.relativeHumidity"> Relative Humidity: <b> {{Number(devices[device]?.environmentMetrics?.data?.environmentMetrics?.relativeHumidity).toFixed(0)}}</b> </li>
                <li v-if="devices[device]?.environmentMetrics?.data?.environmentMetrics?.barometricPressure"> Barometric Pressure: <b> {{Number(devices[device]?.environmentMetrics?.data?.environmentMetrics?.barometricPressure).toFixed(0)}}</b> </li>
                <li v-if="devices[device]?.environmentMetrics?.data?.environmentMetrics?.gasResistance"> Gas Resistance: <b> {{Number(devices[device]?.environmentMetrics?.data?.environmentMetrics?.gasResistance).toFixed(1)}}</b> </li>
                <li v-if="devices[device]?.environmentMetrics?.data?.environmentMetrics?.voltage"> Voltage: <b> {{Number(devices[device]?.environmentMetrics?.data?.environmentMetrics?.voltage).toFixed(1)}}</b> </li>
                <li v-if="devices[device]?.environmentMetrics?.data?.environmentMetrics?.current"> Current: <b> {{Number(devices[device]?.environmentMetrics?.data?.environmentMetrics?.current).toFixed(1)}}</b> </li>
              </ul>
              
              <dl v-if="devices[device]?.message?.from "><hr><b>Last public Message</b> <i>{{ timeAgo(new Date(Date.parse(devices[device]?.message?.rxTime)).getTime()) }}</i></dl>
              <ul v-if="devices[device]?.message?.from">
                <li v-if="devices[device]?.message?.rxRssi"> rxRssi: <b> {{devices[device]?.message?.rxRssi}}</b> </li>
                <li v-if="devices[device]?.message?.rxSnr"> rxSnr: <b> {{devices[device]?.message?.rxSnr}}</b> </li>
                <li v-if="devices[device]?.message?.hopLimit"> Hop: <b> {{devices[device]?.message?.hopLimit}}</b> </li>
                <li v-if="devices[device]?.message?.type === 'broadcast' && devices[device]?.message?.data"> Message: <b> {{devices[device]?.message?.data}}</b> </li>
              </ul>

               <!-- ниже немного не работает таймер? тестируй -->
              <dl v-if="devices[device]?.routing?.from && (Date.now() - Date.parse(devices[device]?.routing?.rxTime) < 10800*1000)"><hr><b>Last Ping </b> <i>{{ timeAgo(new Date(Date.parse(devices[device]?.routing?.rxTime)).getTime()) }}</i></dl>
              <ul v-if="devices[device]?.routing?.from && (Date.now() - Date.parse(devices[device]?.routing?.rxTime) < 10800*1000)">
                <li v-if="devices[device]?.routing?.rxRssi   && devices[device]?.routing?.data?.errorReason !== 'NO_RESPONSE'"> rxRssi: <b> {{devices[device]?.routing?.rxRssi}}</b> </li>
                <li v-if="devices[device]?.routing?.rxSnr    && devices[device]?.routing?.data?.errorReason !== 'NO_RESPONSE'"> rxSnr: <b> {{devices[device]?.routing?.rxSnr}}</b> </li>
                <li v-if="devices[device]?.routing?.hopLimit && devices[device]?.routing?.data?.errorReason !== 'NO_RESPONSE'"> Hop: <b> {{devices[device]?.routing?.hopLimit}}</b> </li>
                <li v-if="devices[device]?.routing?.type"> Ping Type: <b> {{devices[device]?.routing?.type}}</b> </li>
                <li v-if="devices[device]?.routing?.data?.errorReason === 'NONE' "> Last Ping state: <b> Ping OK</b> </li>
                <li v-if="devices[device]?.routing?.data?.errorReason === 'NO_RESPONSE' "> Last Ping state: <b> NO RESPONSE</b> </li>
              </ul>
              
              <dl v-if="devices[device].server"> <hr> <b>MQTT Server: </b> </dl>
                <ul>
                  <li> {{devices[device].server}} </li>
                </ul>
            </ul>


            
            <!-- <table>
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
            </table> -->
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
const mapCenter = ref();

const shouldShowChartsModal = computed(() => Boolean(chosenNodeId.value));

const handleChartsModalClose = () => {
  chosenNodeId.value = null;
}

const fetchDevices = () =>
  fetch("https://meshtasticback.taubetele.com/api")
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

const handleChartButtonClick = (event) => {
  const { nodeId } = event.target.dataset;
  if (nodeId) {
    handleChartOpen(nodeId);
  }
};

const handleLocationClick = (event) => {
  const { latitude, longitude } = event.target.dataset;
  handleTableClose();
  mapCenter.value = [latitude, longitude];
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
      // else if (devices.value[candidate]?.environmentMetrics?.from.toLowerCase().match(needle)) {
      //   candidates[candidate] = devices.value[candidate] // почему не работает?
      // }
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
}

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  const min = Math.floor(seconds / 60);
  const hours = Math.floor(seconds / 60 / 60);
  if (hours > 23) {
    return "old data" // выводим пусто
  }
  if (hours >= 1) {
    return hours + " hours ago";
  }
  if (min >= 1) {
    return min + " min ago";
  }
  if (seconds < 10) return "just now";
  return Math.floor(seconds) + " sec ago";
};


</script>
<style lang="scss">
.filter-wrapper {
  position: sticky;
  top: 0;
  left: 0;
  background: white;
}

li {
  padding-left: 10px;
}

button svg {
  pointer-events: none;
}
</style>
