import './style.css';
import './core/profiler'; // instala a instrumentação de Web Audio antes do motor
import { createShowtime } from './core/engine';
import { installNativeBridge } from './core/native-bridge';

createShowtime();
installNativeBridge();
