<template>
  <!-- <div class="top-menu">
    <div class="flex items-center justify-center w-10 h-full mt-auto cursor-pointer" @click="console.log('фадеев заебал')" >
      <img src="/src/assets/icons/bars-solid.svg" alt="Toogle filter" class="w-5 h-5 xl:w-6 xl:h-6 filter-icon" />
    </div>
    <div class="font-bold transition-colors w-fit text-breakpoints"> Meshtastic Map </div>
    <div class="flex flex-wrap ml-auto mr-3 text-blue-500 text-breakpoints">
      <div @click="console.log('фадеев заебал')">
      <div> ? </div>
      </div>
    </div>
  </div>
  <div v-if="!devices" class="flex mt-10 italic left-5">Loading...</div>
  <div class="flex flex-col w-full h-full mt-10 xl:flex-row" style="z-index: 3001">
    <div v-if="devices && !hideFilterPanel" class="overflow-y-scroll border-r h-full " id="menu?" :class="{ '-hidden': hideFilterPanel }">
      <div class="flex flex-col ">
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
            <div v-else>{{ timeAgo(new Date(devices[device].timestamp * 1000).getTime()) }}</div>
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
    </div> -->
    <div id="map" class="w-full h-full"></div>
  <!-- </div> -->
</template>

<script setup>
import { ref, unref, shallowRef, computed, onMounted } from 'vue'

/*
  import { useBreakpoints } from '@vueuse/core' — реактивный оверинжиниринг, котоырй ещё и npm-мить
  Breakpoints:
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400
*/

let hideFilterPanel = ref() // ref(window.innerWidth < 992)

const toggleFilterPanel = () => {
  //  hideFilterPanel.value = !hideFilterPanel.value

}

const devices = ref()

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000)
  const interval = Math.floor(seconds / 60)
  if (interval >= 1) {
    return interval + ' min ago'
  }
  if (seconds < 10) return 'just now'
  return Math.floor(seconds) + ' sec ago'
}

// const server = useServer()

const fetchDevices = () =>
  fetch('/')
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

      window._devices = json
    })
    .catch((any) => {
      console.log('cannot fetch')
    })

onMounted(async () => {
  await fetchDevices()

  let geolocationmsk = [55.76, 37.64] // moskowa center off world
  let map;

  const renderSelfBallon = () => {
    let geolocation = ymaps.geolocation

    // Сравним положение, вычисленное по ip пользователя и положение, вычисленное средствами браузера.
    // geolocation.get({
    //     provider: 'yandex',
    //     mapStateAutoApply: true
    // }).then(function (result) {
    //     result.geoObjects.options.set('preset', 'islands#redCircleIcon');
    //     result.geoObjects.get(0).properties.set({
    //         balloonContentBody: 'Мое местоположение по IP'
    //     })
    //     map.geoObjects.add(result.geoObjects);
    // })

    geolocation.
      get({
          provider: 'browser',
          zoom: 8,
          mapStateAutoApply: false
          })
      .then(function (result) {
        result.geoObjects.options.set('preset', 'islands#redCircleIcon')
        result.geoObjects.get(0).properties.set({ balloonContentBody: 'Скорее всего, я тут'})
        map.geoObjects.add(result.geoObjects)
        })
  }
  
  const renderBallons = () => {
    renderSelfBallon();

    for (const index in devices.value) {
      const device = devices.value[index]

      const [latitude, longitude] = [device?.position?.data?.latitudeI / 10000000, device?.position?.data?.longitudeI / 10000000]
      const name = device?.user?.data?.shortName || device?.user?.data?.longName || device?.user?.data?.id

      const [[leftBottomLat, leftBottomLong], [rightTopLat, rightTopLong]] = map.getBounds();

      if (!latitude || !longitude) {
        continue
      }

      if (latitude < leftBottomLat || latitude > rightTopLat) {
        continue
      }

      if (longitude < leftBottomLong || longitude > rightTopLong) {
        continue
      }

        let presetcolor = ((device?.user?.rxSnr === 0)&& (device?.user?.rxRssi === 0))  ? 'islands#darkBlueStretchyIcon' : 'islands#blueStretchyIcon'
        presetcolor = (Math.round(Date.now() / 1000) - device.timestamp > 3600) ? 'islands#greyStretchyIcon' : presetcolor
        const timestampfooter = (Math.round(Date.now() / 1000) - device.timestamp > 3600) ? (new Date(device.timestamp * 1000).toLocaleString()) : (timeAgo(new Date(device.timestamp * 1000).getTime()))

        let balloonContents = ''
        if (device?.position?.data?.altitude) { balloonContents += `<div>Altitude: ${Number(device?.position?.data?.altitude).toFixed(0)} m</div>` }
        if (device?.position?.data?.satsInView) { balloonContents += `<div>Sat's in view: ${device?.position?.data?.satsInView} Sat's</div>`}
      
        const { environmentMetrics} = device?.environmentMetrics?.data || {};
        if (environmentMetrics?.temperature) { balloonContents += `<div>Temperature: ${Number(device?.environmentMetrics?.data?.environmentMetrics?.temperature).toFixed(1)} C</div>` }
        if (environmentMetrics?.relativeHumidity) { balloonContents += `<div>Humidity: ${Number(device?.environmentMetrics?.data?.environmentMetrics?.relativeHumidity).toFixed(0)} %</div>` }
        if (environmentMetrics?.barometricPressure) { balloonContents += `<div>Pressure: ${Math.round(device?.environmentMetrics?.data?.environmentMetrics?.barometricPressure)} hPa</div>` }
        if (environmentMetrics?.gasResistance) { balloonContents += `<div>Gas Resistance (AQI): ${Number(device?.environmentMetrics?.data?.environmentMetrics?.gasResistance).toFixed(0)} MOhms</div>` }

        const { deviceMetrics } = device?.deviceMetrics?.data || {};
        if (deviceMetrics?.batteryLevel) { balloonContents += `<div>Battery: ${Number(device?.deviceMetrics?.data?.deviceMetrics?.batteryLevel).toFixed(0) > 100 ? 100 : Number(device?.deviceMetrics?.data?.deviceMetrics?.batteryLevel).toFixed(0)} % (${Number(device?.deviceMetrics?.data?.deviceMetrics?.voltage).toFixed(2)} V)</div>` }
        if (deviceMetrics?.airUtilTx) { balloonContents += `<div>Air util TX: ${Number(device?.deviceMetrics?.data?.deviceMetrics?.airUtilTx).toFixed(1)} %</div>` }

        if (device?.user?.rxRssi!== undefined && device?.user?.rxSnr!== undefined && device?.user?.rxRssi !== 0) { balloonContents += `<div>NodeInfo RX RSSI: ${Math.round(device?.user?.rxRssi).toFixed(0)},  SNR: ${Math.round(device?.user?.rxSnr).toFixed(0)}</div>` }
        if (device?.position?.rxRssi!== undefined && device?.position?.rxSnr!== undefined && device?.position?.rxRssi !== 0) { balloonContents += `<div>Position RX RSSI: ${Math.round(device?.position?.rxRssi).toFixed(0)},  SNR: ${Math.round(device?.position?.rxSnr).toFixed(0)}</div>` }
        if (device?.deviceMetrics?.rxRssi!== undefined && device?.deviceMetrics?.rxSnr!== undefined && device?.deviceMetrics?.rxRssi !== 0) { balloonContents += `<div>Device Metrics RX RSSI: ${Math.round(device?.deviceMetrics?.rxRssi).toFixed(0)},  SNR: ${Math.round(device?.deviceMetrics?.rxSnr).toFixed(0)}</div>` }

        if (((device?.user?.hopLimit)||(device?.position?.hopLimit)||(device?.deviceMetrics?.hopLimit)) && device?.user?.rxRssi !== 0){
          balloonContents += `<div>Hop's:` 
          if (device?.user?.hopLimit) { balloonContents += ` User: ${Number(device?.user?.hopLimit)}` }
          if (device?.position?.hopLimit) { balloonContents += ` Position: ${Number(device?.position?.hopLimit)}` }
          if (device?.deviceMetrics?.hopLimit) { balloonContents += ` Telemetry: ${Number(device?.deviceMetrics?.hopLimit)} ` }
          balloonContents += `</div>` 
        }
        if ((device?.user?.rxSnr === 0) && (device?.user?.rxRssi === 0)) {
          balloonContents += `<div class="font-bold">MQTT: YES </div>`
          balloonContents += `<div>Server: ${device?.server}</div>`
        }
        if (device?.message?.data !== undefined) { balloonContents += `<div>Last public message: ${device.message.data} </div>` }

        map.geoObjects
          .add(new window.ymaps.Placemark([latitude, longitude], {
            iconContent: name,
            balloonContentHeader: `
              <div>Short Name: ${device?.user?.data?.shortName}</div>
              <div>Long Name: ${device?.user?.data?.longName}</div>`,
            balloonContentBody: ` 
              <div>Node ID: ${device?.user?.data?.id} (${(device?.position?.from) ? device?.position?.from : device?.deviceMetrics?.from})</div>
              <div>Hardware: ${device?.user?.data?.hwModel}</div>
              <div>Role: ${device?.user?.data?.role}</div>

              <div>Position: <a href="yandexmaps://maps.yandex.ru/?ll=${latitude},${longitude}&z=12"> ${latitude}, ${longitude}</a></div>

              <div> ${balloonContents}</div>`,
            balloonContentFooter: `Updated: ${timestampfooter}`
          }, { preset: `${presetcolor}` }))       

    } 
  }

  const initYMap = () => {
     map = new ymaps.Map('map', {
      center: geolocationmsk,
      zoom: 9
    })
    map.controls.remove('fullscreenControl') // костыль против двух кнопок
    map.controls.remove('searchControl') // удаляем кнопку перехода в полноэкранный режим

    // var fullscreenControl = new ymaps.control.FullscreenControl();
    // map.controls.add(fullscreenControl)
    // fullscreenControl.enterFullscreen() // переходив в enterFullscreen

    let button = new ymaps.control.Button("INFO");
    map.controls.add(button, { float: 'left', floatIndex: 0 });
    button.events.add('click', function () {
      alert('Еще не работает :)')
    })

    let firstButton = new ymaps.control.Button("СПИСОК")
    map.controls.add(firstButton, { selectOnClick: false, float: 'left', floatIndex: 0 });

    firstButton.events.add('click', function () {
      fullscreenControl.exitFullscreen()
    })


    map.events.add("boundschange", function(e) {
      // console.log(map.balloon.open.position)
      map.geoObjects.removeAll()
      // if (map.balloon.isOpen())

      renderBallons()

      // var zoom = e.get("newZoom")
      // localStorage("zoom", zoom)
      // console.log(e.get("oldCenter"), e.get("newCenter"), e.get("oldZoom"), e.get("newZoom"),  e.get("oldBounds"), e.get("newBounds"))
      // if (zoom != e.get("oldZoom"))
      //     SetCookie("zoom", zoom);
      // if (GP != e.get("oldCenter"))
      //     pmid = 0;
      // if (map.balloon.isOpen() == false)
      //     WaitMarkers();
    })

  

    map.events.add("contextmenu", function(e) {
                    console.log(e.get("coords"))
    })
  }

  const init = () => {
    
    initYMap();

    renderBallons();
    

    window._map = map;

    // _map.geoObjects.each((el, i) => {
      // console.log(el, i)
    // })
    
  }

 
  ymaps.ready(init)
  //  console.log(map.getCenter())

  setInterval(() => {
    fetchDevices()
    map.geoObjects.removeAll();
    renderBallons()
  }, 20000)
})

const filter = shallowRef('')

// this is actually a setFilter
const addToFilter = (item) => {
  // console.debug('addToFilter item', item)
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


<style lang="scss">
/* Pls install PostCSS Language Support extension */

/* 
 * Color converter here
 * https://isotropic.co/tool/hex-color-to-css-filter/
 */
.filter-icon {
  filter: invert(73%) sepia(0%) saturate(0%) hue-rotate(187deg) brightness(90%) contrast(86%);
}

.top-menu {
  @apply fixed top-0 z-50;
  @apply flex flex-row items-center;
  @apply w-full h-10;
  @apply gap-1 md:gap-2 lg:gap-4;
  @apply pl-3;
  @apply border-b;
  @apply bg-neutral-100;
}

.text-breakpoints {
  @media (max-width: 500px) {
    @apply text-[12px];
  }
  @media (min-width: 500px) and (max-width: 600px) {
    @apply text-sm;
  }
}
</style>
