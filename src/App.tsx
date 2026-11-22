import { useEffect } from 'react'

function App() {
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'module'
    script.src = '/assets/index-CmihENm6.js'
    document.head.appendChild(script)

    return () => script.remove()
  }, [])

  return <div id="root" />
}

export default App
