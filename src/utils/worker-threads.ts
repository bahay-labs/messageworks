export function isWorkerThreads(): boolean {
  return typeof require !== 'undefined' && require('worker_threads') !== undefined
}
