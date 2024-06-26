export const useGetVh = () => {
  const vhHeight = () => {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight / 100}px`)
  }
  window.addEventListener('resize', vhHeight)
  vhHeight()
}