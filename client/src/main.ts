import { createApp } from 'vue'
import {
  ElAlert,
  ElButton,
  ElColorPicker,
  ElImage,
  ElInputNumber,
  ElOption,
  ElProgress,
  ElSegmented,
  ElSelect,
  ElSlider,
} from 'element-plus'
import 'element-plus/es/components/alert/style/css'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/color-picker/style/css'
import 'element-plus/es/components/image/style/css'
import 'element-plus/es/components/input-number/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/option/style/css'
import 'element-plus/es/components/progress/style/css'
import 'element-plus/es/components/segmented/style/css'
import 'element-plus/es/components/select/style/css'
import 'element-plus/es/components/slider/style/css'
import App from './App.vue'
import router from './router'
import './styles/main.css'

const app = createApp(App)
;[ElAlert, ElButton, ElColorPicker, ElImage, ElInputNumber, ElOption, ElProgress, ElSegmented, ElSelect, ElSlider]
  .forEach((component) => app.component(component.name!, component))
app.use(router).mount('#app')
