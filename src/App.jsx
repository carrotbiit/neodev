import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import SynthwaveBackground from './components/SynthwaveBackground'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <SynthwaveBackground className="page-background" speed={2} />

    </>
  )
}

export default App
