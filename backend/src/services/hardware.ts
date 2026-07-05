// src/services/hardware.ts — Detect hardware specs via child_process
import { spawnSync } from 'node:child_process';

export interface HardwareInfo {
  chip: string;
  cpuCoresPhysical: number;
  cpuCoresLogical: number;
  ramBytes: number;
  gpuModel: string;
  storageTotalBytes?: number;
}

const defaultStub: HardwareInfo = {
  chip: 'Unknown',
  cpuCoresPhysical: 0,
  cpuCoresLogical: 0,
  ramBytes: 0,
  gpuModel: 'Unknown',
};

export function stubHardware(): HardwareInfo {
  return { ...defaultStub };
}

/** macOS sysctl 기반 하드웨어 감지 */
function detectMacOS(): HardwareInfo {
  const run = (key: string): string => {
    try {
      const result = spawnSync('sysctl', ['-n', key], { encoding: 'utf8' });
      return result.stdout?.trim() ?? '';
     } catch {
    return '';
   }
  };

  const chip = run('machdep.cpu.brand_string') || run('sysctl.machdep.cpu.brand_string') || 'Apple Silicon';
  const cpuCoresPhysical = parseInt(run('hw.physicalcpu'), 10) || 0;
  const cpuCoresLogical = parseInt(run('hw.logicalcpu'), 10) || 0;
  const ramBytes = parseInt(run('hw.memsize'), 10) || 0;

  return {
    chip,
    cpuCoresPhysical,
    cpuCoresLogical,
    ramBytes,
    gpuModel: resolveMacOSGpu(),
    };
}

/** macOS GPU 모델명을 system_profiler에서 실제 파싱 */
function resolveMacOSGpu(): string {
  try {
    const out: string = spawnSync('system_profiler', ['SPDisplaysDataType'], { encoding: 'utf8' }).stdout ?? '';
    const match = out.match(/Chipset:\s*(.+)/);
    return match?.[1]?.trim() || 'Apple Integrated GPU';
    } catch {
    return 'Apple Integrated GPU';
    }
}

function detectLinux(): HardwareInfo {
  const read = (path: string): string => {
    try {
      return spawnSync('cat', [path], { encoding: 'utf8' }).stdout?.trim() ?? '';
     } catch {
    return '';
   }
  };

  const chipInfo = read('/proc/cpuinfo');
  const chip = chipInfo.match(/model name\s*:\s*(.+)/)?.[1]?.trim() || 'Linux CPU';
  const cpuCoresPhysical = (chipInfo.match(/\bprocessor\b/g) || []).length;
  const memInfo = read('/proc/meminfo');
  const ramBytes = parseInt((memInfo.match(/MemTotal:\s*(\d+) kB/) || [])[1], 10) * 1024 || 0;

   // GPU 감지 (NVIDIA 기준)
  let gpuModel = 'Unknown';
  try {
    const nvidia = spawnSync('nvidia-smi', ['--query-gpu=gpu_name', '--format=csv,noheader'], { encoding: 'utf8' });
    if (nvidia.stdout?.trim()) gpuModel = nvidia.stdout.trim().split('\n')[0];
   } catch {
   // NVIDIA 없음 — 무시
  }

  return { chip, cpuCoresPhysical, cpuCoresLogical: cpuCoresPhysical, ramBytes, gpuModel };
}

export async function detectHardware(): Promise<HardwareInfo> {
  const platform = spawnSync('uname', ['-s'], { encoding: 'utf8' }).stdout?.trim() ?? '';

   switch (platform) {
    case 'Darwin': return detectMacOS();
      case 'Linux': return detectLinux();
     default: return stubHardware();
    }
}
