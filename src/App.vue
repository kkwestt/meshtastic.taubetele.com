<template>
  <div class="flex flex-col w-full h-full xl:flex-row">
    <div class="overflow-y-scroll border-r xl:w-1/3 h-1/2 xl:h-full">
      <div class="p-3 transition-colors bg-neutral-200">
        Meshtastic MQTT Map
      </div>
      <div class="flex flex-wrap gap-1 m-1 text-blue-500">
        <!-- <div class="p-1"> Servers:</div>
        <div @click="addToFilter(server)" v-for="server in servers" :key="server" class="p-1 text-sm text-white bg-blue-500 cursor-pointer">
          {{ server }}
        </div> -->
      </div>
      <div v-if="!devices" class="p-3 italic">Fetching devices...</div>
      <div v-else class="flex flex-col">
        <div class="px-3 mt-3">
          <input v-model="filter" class="w-full border p-1.5 hover:outline-none focus:outline-none" placeholder="Фильтр" />
        </div>
        <div class="p-3 transition-colors hover:bg-neutral-100" v-for="device in filtered" :key="device">
          <div class="cursor-pointer select-none" >
            <div class="text-xl flex gap-1.5 cursor-pointer" @click="devices[device].opened = !devices[device].opened">
              <span :class="(Math.round(Date.now() / 1000) - devices[device].timestamp) > 3600 ? 'text-neutral-500' : 'text-blue-600'">
                <span v-if="devices[device].user?.data?.longName">{{ devices[device].user?.data?.longName }}</span>
                <span v-else>{{ device }}</span>
              </span>
            <div @click="addToFilter(devices[device].server)" class="p-1 text-sm text-blue-500 cursor-pointer w-fit">{{ devices[device].server }}</div>
          </div><div v-if="((Math.round(Date.now() / 1000) - devices[device].timestamp) > 3600)" @click="addToFilter(devices[device].user?.data?.longName)"> Last heard: {{new Date(devices[device].timestamp * 1000).toLocaleString()}} </div>
            <div v-else>{{ timeAgo(new Date(devices[device].timestamp * 1000).getTime()) }}</div>
          </div>
          <div v-if="devices[device].opened">
            <table>
              <tbody>
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
                  <td>{{ devices[device].user.data.id }}</td>
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
                  <td>Hop Limit</td>
                  <td>{{ devices[device].user.hopLimit + 1 }}</td>
                </tr>
                <tr v-if="devices[device]?.user?.rxSnr">
                  <td>RX SNR</td>
                  <td>{{ devices[device].user.rxSnr }} <br> уровень сигнала с которым пришел пакет nodeinfo</td>
                </tr>
                <tr v-if="devices[device]?.user?.rxRssi">
                  <td>RX RSSI</td>
                  <td>{{ devices[device].user.rxRssi }} <br> уровень сигнала с которым пришел пакет nodeinfo</td>
                </tr>
                <tr v-if="devices[device]?.telemetry?.data?.deviceMetrics?.airUtilTx">
                  <td>Air util tx</td>
                  <td>{{ Number(devices[device].telemetry.data.deviceMetrics.airUtilTx).toFixed(1) }} %</td>
                </tr>
                <tr v-if="devices[device]?.telemetry?.data?.deviceMetrics?.channelUtilization">
                  <td>Channel utilization</td>
                  <td>{{ Number(devices[device].telemetry.data.deviceMetrics.channelUtilization).toFixed(1) }} %</td>
                </tr>
                <tr v-if="devices[device]?.user?.channel >= 0">
                  <td>Lora channel</td>
                  <td>{{ devices[device].user.channel }}</td>
                </tr>
                <tr v-if="devices[device]?.telemetry?.data?.deviceMetrics?.voltage">
                  <td>Battery voltage</td>
                  <td>{{ Number(devices[device]?.telemetry?.data?.deviceMetrics?.voltage).toFixed(1) }} V</td>
                </tr>
                <tr v-if="devices[device]?.telemetry?.data?.deviceMetrics?.batteryLevel">
                  <td>Battery level</td>
                  <td>{{ (devices[device].telemetry.data.deviceMetrics.batteryLevel > 100) ? 100 : (Math.round(devices[device].telemetry.data.deviceMetrics.batteryLevel))  }} %</td>
                </tr>
                <tr v-if="devices[device]?.telemetry2?.data?.deviceMetrics?.barometricPressure">
                  <td>Barometric pressure</td>
                  <td>{{ Math.round(devices[device].telemetry.data.environmentMetrics.barometricPressure) }} hPa</td>
                </tr>
                <tr v-if="devices[device]?.telemetry?.data?.environmentMetrics?.current">
                  <td>Current</td>
                  <td>{{ devices[device].telemetry.data.environmentMetrics.current }}</td>
                </tr>
                <tr v-if="devices[device]?.telemetry?.data?.environmentMetrics?.voltage">
                  <td>Voltage</td>
                  <td>{{ devices[device].telemetry.data.environmentMetrics.voltage }}</td>
                </tr>
                <tr v-if="devices[device]?.telemetry?.data?.environmentMetrics?.gasResistance">
                  <td>Gas</td>
                  <td>{{ Number(devices[device].telemetry.data.environmentMetrics.gasResistance).toFixed(0) }} MOhms</td>
                </tr>
                <tr v-if="devices[device]?.telemetry?.data?.environmentMetrics?.relativeHumidity">
                  <td>Humidity</td>
                  <td>{{ Number(devices[device].telemetry.data.environmentMetrics.relativeHumidity).toFixed(0) }} %</td>
                </tr>
                <tr v-if="devices[device]?.telemetry?.data?.environmentMetrics?.temperature">
                  <td>Temperature</td>
                  <td>{{ Number(devices[device].telemetry.data.environmentMetrics.temperature).toFixed(1) }} ℃</td>
                </tr>
                <!-- <tr v-if="devices[device]?.mqtt">
                  <td><div class="font-bold">MQTT: </div></td> <td><div class="font-bold">Online</div></td>
                </tr> -->
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
      const names = Object.keys(json);
      names.forEach(name => {
        json[name].timestamp = new Date(json[name].timestamp).getTime() / 1000;
      })

      devices.value = json
    })
    .catch((any) => { })

onMounted(async () => {
  await fetchDevices()
  setInterval(fetchDevices, 30 * 1000)

  let geolocation = [55.76, 37.64]
  
  if (await navigator.geolocation) { 
    navigator.geolocation.getCurrentPosition((position) => {
      console.log(geolocation)
      geolocation = [position.coords.latitude, position.coords.longitude]
      console.log(geolocation)
    })
  }

  const init = () => {
    const map = new window.ymaps.Map('map', {
      center: geolocation,
      zoom: 9,
      controls: ['smallMapDefaultSet']
    })

    for (const index in devices.value) {
      const device = devices.value[index]

      const [latitude, longitude] = [device?.position?.data?.latitudeI / 10000000, device?.position?.data?.longitudeI / 10000000]
      const name = device?.user?.data?.shortName || device?.user?.data?.longName || device?.user?.data?.id// || device?.position?.from || device?.telemetry?.from

      if (latitude && longitude && (Math.round(Date.now() / 1000) - device.timestamp < 86400) ) {
        let presetcolor = device?.user?.data?.hwModel === 'DIY_V1' ? 'islands#redStretchyIcon' : 'islands#blueStretchyIcon'
        presetcolor = (Math.round(Date.now() / 1000) - device.timestamp > 3600) ? 'islands#greyStretchyIcon' : presetcolor
        const timestampfooter = (Math.round(Date.now() / 1000) - device.timestamp > 3600) ? (new Date(device.timestamp * 1000).toLocaleString()) : (timeAgo(new Date(device.timestamp * 1000).getTime()))

        let balloonContents = ''
        if (device?.position?.data?.altitude) { balloonContents += `<div>Altitude: ${Number(device?.position?.data?.altitude).toFixed(0)} m</div>` }
        if (device?.position?.data?.satsInView) { balloonContents += `<div>Sat's in view: ${device?.position?.data?.satsInView} Sat's</div>`}
      
        if (device?.telemetry?.data?.environmentMetrics?.temperature) { balloonContents += `<div>Temperature: ${Number(device?.telemetry?.data?.environmentMetrics?.temperature).toFixed(1)} C</div>` }
        if (device?.telemetry?.data?.environmentMetrics?.relativeHumidity) { balloonContents += `<div>Humidity: ${Number(device?.telemetry?.data?.environmentMetrics?.relativeHumidity).toFixed(0)} %</div>` }
        if (device?.telemetry?.data?.environmentMetrics?.barometricPressure) { balloonContents += `<div>Pressure: ${Math.round(device?.telemetry?.data?.environmentMetrics?.barometricPressure)} hPa</div>` }
        if (device?.telemetry?.data?.environmentMetrics?.gasResistance) { balloonContents += `<div>Gas Resistance (AQI): ${Number(device?.telemetry?.data?.environmentMetrics?.gasResistance).toFixed(0)} MOhms</div>` }
        if (device?.telemetry?.data?.environmentMetrics?.voltage) { balloonContents += `<div>Battery voltage: ${Number(device?.telemetry?.data?.environmentMetrics?.voltage).toFixed(1)} V</div>` }
        if (device?.telemetry?.data?.environmentMetrics?.current) { balloonContents += `<div>Current: ${Number(device?.telemetry?.data?.environmentMetrics?.current).toFixed(1)} %</div>` }

        if (device?.telemetry?.data?.deviceMetrics?.batteryLevel) { balloonContents += `<div>Battery level: ${Number(device?.telemetry?.data?.deviceMetrics?.batteryLevel).toFixed(0) > 100 ? 100 : Number(device?.telemetry?.data?.deviceMetrics?.batteryLevel).toFixed(0)} %</div>` }
        if (device?.telemetry?.data?.deviceMetrics?.voltage) { balloonContents += `<div>Battery voltage: ${Number(device?.telemetry?.data?.deviceMetrics?.voltage).toFixed(1)} V</div>` }
        if (device?.telemetry?.data?.deviceMetrics?.channelUtilization) { balloonContents += `<div>Channel utilization: ${Number(device?.telemetry?.data?.deviceMetrics?.channelUtilization).toFixed(1)} %</div>` }
        if (device?.telemetry?.data?.deviceMetrics?.airUtilTx) { balloonContents += `<div>Air util TX: ${Number(device?.telemetry?.data?.deviceMetrics?.airUtilTx).toFixed(1)} %</div>` }

        if (device?.user?.rxSnr) { balloonContents += `<div>RX SNR: ${Math.round(device?.user?.rxSnr).toFixed(0)}</div>` }
        if (device?.user?.rxRssi) { balloonContents += `<div>RX RSSI: ${Math.round(device?.user?.rxRssi).toFixed(0)}</div>` }
        if (device?.user?.hopLimit) { balloonContents += `<div>Hop Limit: ${Number(device?.user?.hopLimit + 1)}</div>` }

        // if (device?.mqtt !== undefined) {
        //   balloonContents += `<div class="font-bold">MQTT: YES </div>`
        //   balloonContents += `<div>Server: ${device?.server}</div>`
        // }
        if (device?.message?.data !== undefined) { balloonContents += `<div>Last public message: ${device.message.data} </div>` }
        // if (device?.user?.sender !== undefined) { balloonContents += `<div>Data (user) recieved over Node ID: ${device?.user?.sender} </div>` }
        // if (device?.position?.sender !== undefined) { balloonContents += `<div>Data (position) recieved over Node ID: ${device?.position?.sender} </div>` }
        // if (device?.telemetry?.sender !== undefined) { balloonContents += `<div>Data (telemetry) recieved over Node ID: ${device?.telemetry?.sender} </div>` }
        // if (device?.telemetry2?.sender !== undefined) { balloonContents += `<div>Data (telemetry2) recieved over Node ID: ${device?.telemetry2?.sender} </div>` }

        map.geoObjects
          .add(new window.ymaps.Placemark([latitude, longitude], {
            iconContent: name,
            balloonContentHeader: `
              <div>Short Name: ${device?.user?.data?.shortName}</div>
              <div>Long Name: ${device?.user?.data?.longName}</div>`,
            balloonContentBody: ` 
              <div>Node ID: ${device?.user?.data?.id} </div>
              <div>Hardware: ${device?.user?.data?.hwModel}</div>
              <div>Position: <a href="yandexmaps://maps.yandex.ru/?ll=${latitude},${longitude}&z=12"> ${latitude}, ${longitude}</a></div>

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
      console.log(
        devices.value[candidate].server,
        devices.value[candidate]?.user?.data?.shortName,
        devices.value[candidate]?.user?.data?.longName,
        devices.value[candidate]?.user?.data?.id
      )
      // сюда
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

  // console.log('C', candidates)

  return Array.from(candidates)
})

</script>
