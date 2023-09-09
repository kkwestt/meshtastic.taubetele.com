<template>
  <div class="flex flex-col xl:flex-row w-full h-full">
    <div class="xl:w-1/3 h-1/2 xl:h-full border-r overflow-y-scroll">
      <div class="bg-neutral-200 transition-colors p-3">
        Meshtastic MQTT Map
      </div>
      <div class="flex flex-wrap gap-1 m-1 text-white">
        <div @click="addToFilter(server)" v-for="server in servers" :key="server" class="text-sm  cursor-pointer bg-blue-500 p-1">
          {{ server }}
        </div>
      </div>
      <div v-if="!devices" class="italic p-3">Fetching devices...</div>
      <div v-else class="flex flex-col">
        <div class="px-3 mt-3">
          <input v-model="filter" class="w-full border p-1.5 hover:outline-none focus:outline-none" placeholder="Фильтр" />
        </div>
        <div class="hover:bg-neutral-100 transition-colors p-3" v-for="device in filtered" :key="device">
          <div class="select-none cursor-pointer" >
            <div class="text-xl flex gap-1.5 cursor-pointer" @click="devices[device].opened = !devices[device].opened">
              <span :class="(Math.round(Date.now() / 1000) - devices[device].timestamp) > 3600 ? 'text-neutral-500' : 'text-blue-600'">
                <span v-if="devices[device].nodeinfo?.payload?.longname">{{ devices[device].nodeinfo?.payload?.longname }}</span>
                <span v-else>{{ device }}</span>
              </span>
            </div>
            <div @click="addToFilter(devices[device].server)" class="text-sm cursor-pointer p-1 w-fit bg-blue-500 text-white">{{ devices[device].server }}</div>
            <div v-if="((Math.round(Date.now() / 1000) - devices[device].timestamp) > 3600)"> Last heard: {{new Date(devices[device].timestamp * 1000).toLocaleString()}} </div>
            <div v-else>{{ timeAgo(new Date(devices[device].timestamp * 1000).getTime()) }}</div>
          </div>
          <div v-if="devices[device].opened">
            <table>
              <tbody>
                <tr v-if="devices[device]?.nodeinfo?.payload?.shortname">
                  <td>Short name</td>
                  <td>{{ devices[device].nodeinfo.payload.shortname }}</td>
                </tr>
                <tr v-if="devices[device]?.nodeinfo?.payload?.hardware">
                  <td>Hardware</td>
                  <td>{{ hardwareName[devices[device].nodeinfo.payload.hardware] }}</td>
                </tr>
                <tr v-if="devices[device]?.nodeinfo?.payload?.id">
                  <td>ID</td>
                  <td>{{ devices[device].nodeinfo.payload.id }}</td>
                </tr>
                <tr v-if="devices[device]?.position?.payload?.latitude_i">
                  <td>Position </td>
                  <td>{{ Number(devices[device].position.payload.latitude_i / 10000000).toFixed(4) }}, {{ Number(devices[device].position.payload.longitude_i / 10000000).toFixed(4) }}</td>
                </tr>
                <tr v-if="devices[device]?.position?.payload?.altitude">
                  <td>Altitude</td>
                  <td>{{ devices[device].position.payload.altitude }} m</td>
                </tr>
                <tr v-if="devices[device]?.telemetry?.payload?.air_util_tx">
                  <td>Air util tx</td>
                  <td>{{ Number(devices[device].telemetry.payload.air_util_tx).toFixed(1) }} %</td>
                </tr>
                <tr v-if="devices[device]?.telemetry?.payload?.channel_utilization">
                  <td>Channel utilization</td>
                  <td>{{ Number(devices[device].telemetry.payload.channel_utilization).toFixed(1) }} %</td>
                </tr>
                <tr v-if="devices[device]?.telemetry?.payload?.voltage">
                  <td>Battery voltage</td>
                  <td>{{ Number(devices[device].telemetry.payload.voltage).toFixed(1) }} V</td>
                </tr>
                <tr v-if="devices[device]?.telemetry?.payload?.battery_level">
                  <td>Battery level</td>
                  <td>{{ Math.round(devices[device].telemetry.payload.battery_level) }} %</td>
                </tr>
                <tr v-if="devices[device]?.telemetry2?.payload?.barometric_pressure">
                  <td>Barometric pressure</td>
                  <td>{{ Math.round(devices[device].telemetry2.payload.barometric_pressure) }} hPa</td>
                </tr>
                <tr v-if="devices[device]?.telemetry2?.payload?.current">
                  <td>Current</td>
                  <td>{{ devices[device].telemetry2.payload.current }}</td>
                </tr>
                <tr v-if="devices[device]?.telemetry2?.payload?.gas_resistance">
                  <td>Gas</td>
                  <td>{{ Number(devices[device].telemetry2.payload.gas_resistance).toFixed(1) }}</td>
                </tr>
                <tr v-if="devices[device]?.telemetry2?.payload?.relative_humidity">
                  <td>Humidity</td>
                  <td>{{ Math.round(devices[device].telemetry2.payload.relative_humidity) }} %</td>
                </tr>
                <tr v-if="devices[device]?.telemetry2?.payload?.temperature">
                  <td>Temperature</td>
                  <td>{{ Number(devices[device].telemetry2.payload.temperature).toFixed(1) }} ℃</td>
                </tr>
                <tr v-if="devices[device]?.mqtt">
                  <td>MQTT: </td> <td>Online</td>
                </tr>
                <tr v-if="devices[device]?.mqtt">
                  <td>Server: </td> <td>{{devices[device]?.server}}</td>
                </tr>
                <!-- <tr v-if="devices[device]?.nodeinfo?.sender">
                  <td>Data recieved over Node ID: </td> <td>{{devices[device]?.nodeinfo?.sender}} </td>
                </tr> -->
                <tr v-if="devices[device]?.text?.payload">
                  <td>Last public message: </td> <td>{{devices[device]?.text?.payload?.text ? devices[device]?.text?.payload?.text : devices[device]?.text?.payload}} </td>
                  <!-- {"channel":0,"from":4204317948,"id":741847616,"payload":1233,"sender":"!fa98ccfc","timestamp":1694283590,"to":4294967295,"type":"text"} -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <div id="map" class="w-full h-1/2 xl:h-full"></div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, onMounted } from 'vue'
import { useServer } from './servers.js'

const devices = ref()
const devicesPT = ref()
const senderList = ref()

const hardwareName = {
  0: 'UNSET',
  1: 'TLORA V2',
  2: 'TLORA V1',
  3: 'TLORA V2.1 1.6',
  4: 'TBEAM',
  5: 'HELTEC_V2.0',
  6: 'TBEAM V0.7',
  7: 'T-ECHO',
  8: 'TLORA V1 1.3',
  9: 'RAK4631',
  10: 'HELTEC V2.1',
  11: 'HELTEC V1',
  12: 'LILYGO TBEAM S3 CORE',
  13: 'RAK11200',
  14: 'NANO G1',
  15: 'TLORA V2.1 1.8',
  16: 'TLORA T3 S3',
  17: 'NANO G1 EXPLORER',
  25: 'STATION G1',
  26: 'RAK11310',
  32: 'LORA RELAY V1',
  33: 'NRF52840DK',
  34: 'PPR',
  35: 'GENIEBLOCKS',
  36: 'NRF52 UNKNOWN',
  37: 'PORTDUINO',
  38: 'ANDROID SIM',
  39: 'DIY V1',
  40: 'NRF52840 PCA10059',
  41: 'DR DEV',
  42: 'M5STACK',
  43: 'HELTEC V3',
  44: 'HELTEC WSL V3',
  45: 'BETAFPV 2400 TX',
  46: 'BETAFPV 900 NANO TX',
  47: 'RPI PICO'
}

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000)
  const interval = Math.floor(seconds / 60)
  if (interval >= 1) {
    return interval + ' min ago'
  }
  if (seconds < 10) return 'just now'
  return Math.floor(seconds) + ' sec ago'
}

const server = useServer()

const fetchDevices = () =>
  fetch(server.theOnlyOne)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      return response.json()
    })
    .then((json) => {
      // console.log(json)
      devices.value = json
    })
    .catch((any) => { })

onMounted(async () => {
  await fetchDevices()
  setInterval(fetchDevices, 30 * 1000)

  const init = () => {
    const map = new window.ymaps.Map('map', {
      center: [55.76, 37.64],
      zoom: 9,
      controls: ['smallMapDefaultSet']
    })

    for (const index in devices.value) {
      const device = devices.value[index]

      const [latitude, longitude] = [device?.position?.payload?.latitude_i / 10000000, device?.position?.payload?.longitude_i / 10000000]
      const name = device?.nodeinfo?.payload?.shortname || device?.nodeinfo?.payload?.longname || device?.nodeinfo?.payload?.id// || device?.position?.from || device?.telemetry?.from

      if (latitude && longitude) {
        let presetcolor = device?.nodeinfo?.payload?.hardware == 39 ? 'islands#redStretchyIcon' : 'islands#blueStretchyIcon'
        presetcolor = (Math.round(Date.now() / 1000) - device.timestamp > 3600) ? 'islands#greyStretchyIcon' : presetcolor
        const timestampfooter = (Math.round(Date.now() / 1000) - device.timestamp > 3600) ? (new Date(device.timestamp * 1000).toLocaleString()) : (timeAgo(new Date(device.timestamp * 1000).getTime()))

        let balloonContents = ''
        if (device?.position?.payload?.altitude !== undefined) { balloonContents += `<div>Altitude: ${Number(device?.position?.payload?.altitude).toFixed(1)} m</div>` }
        if (device?.telemetry2?.payload?.temperature !== undefined) { balloonContents += `<div>Temperature: ${Number(device?.telemetry2?.payload?.temperature).toFixed(1)} C</div>` }
        if (device?.telemetry2?.payload?.humidity !== undefined) { balloonContents += `<div>Humidity: ${Number(device?.telemetry2?.payload?.humidity).toFixed(1)} %</div>` }
        if (device?.telemetry2?.payload?.barometric_pressure !== undefined) { balloonContents += `<div>Barometric pressure: ${Math.round(device?.telemetry2?.payload?.barometric_pressure)} hPa</div>` }
        if (device?.telemetry?.payload?.voltage !== undefined) { balloonContents += `<div>Battery voltage: ${Number(device?.telemetry?.payload?.voltage).toFixed(1)} V</div>` }
        if (device?.telemetry?.payload?.battery !== undefined) { balloonContents += `<div>Battery level: ${Number(device?.telemetry?.payload?.battery).toFixed(1)} %</div>` }
        if (device?.telemetry?.payload?.air_util_tx !== undefined) { balloonContents += `<div>Air util tx: ${Number(device?.telemetry?.payload?.air_util_tx).toFixed(1)} %</div>` }
        if (device?.telemetry?.payload?.channel_utilization !== undefined) { balloonContents += `<div>Channel utilization: ${Number(device?.telemetry?.payload?.channel_utilization).toFixed(1)} %</div>` }
        if (device?.mqtt) {
          balloonContents += '<div class="font-bold">MQTT: YES </div>'
          balloonContents += `<div>Server: ${device?.server}</div>`
        }
        if (device?.text?.payload !== undefined) { balloonContents += `<div>Last public message: ${device?.text?.payload} </div>` }
        // if (device?.nodeinfo?.sender !== undefined) { balloonContents += `<div>Data (nodeinfo) recieved over Node ID: ${device?.nodeinfo?.sender} </div>` }
        // if (device?.position?.sender !== undefined) { balloonContents += `<div>Data (position) recieved over Node ID: ${device?.position?.sender} </div>` }
        // if (device?.telemetry?.sender !== undefined) { balloonContents += `<div>Data (telemetry) recieved over Node ID: ${device?.telemetry?.sender} </div>` }
        // if (device?.telemetry2?.sender !== undefined) { balloonContents += `<div>Data (telemetry2) recieved over Node ID: ${device?.telemetry2?.sender} </div>` }

        map.geoObjects
          .add(new window.ymaps.Placemark([latitude, longitude], {
            iconContent: name,
            balloonContentHeader: `
              <div>ShortName: ${device?.nodeinfo?.payload?.shortname}</div>
              <div>LongName: ${device?.nodeinfo?.payload?.longname}</div>`,
            balloonContentBody: ` 
              <div>Node ID: ${device?.nodeinfo?.payload?.id} </div>
              <div>Hardware: ${hardwareName[device?.nodeinfo?.payload?.hardware]}</div>
              <div>Position: ${latitude}, ${longitude}</div>
              <div> ${balloonContents}</div>`,
            balloonContentFooter: `Updated: ${timestampfooter}`
          }, { preset: `${presetcolor}` }))
      }
    }
    // map.setBounds(map.geoObjects(), { checkZoomRange: true })
  }

  window.ymaps.ready(init)
})

const filter = shallowRef('')

// this is actually a setFilter
const addToFilter = (item) => {
  filter.value = item
  console.log(item)
}

const filtered = computed(() => {
  if (filter.value === '') {
    return Object.keys(devices.value)
  }
  else {
    const candidates = {}
    // devices is an object почему-то...
    const needle = filter.value.toLowerCase()
    for (const candidate in devices.value) {
      // сюда
      if (devices.value[candidate].server.match(needle)) {
        candidates[candidate] = devices.value[candidate]
      }
    }

    return Object.keys(candidates)

    // return devices.value.filter(device => device.server.match(filter.value.toLowerCase()))
  }
})

const servers = computed(() => {
  if (devices.value === undefined) {
    return []
  }
  const candidates = new Set()
  // все еше Object
  for (const candidate in devices.value) {
    candidates.add(devices.value[candidate].server)
  }

  console.log('C', candidates)

  return Array.from(candidates)
})

</script>
