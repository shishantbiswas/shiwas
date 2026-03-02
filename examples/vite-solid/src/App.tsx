import { createSignal, Show } from 'solid-js'
import { useSWR } from 'shiwas/solid'
import './App.css'

interface Character {
  id: number
  name: string
  status: string
  species: string
  image: string
  location: { name: string }
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

function App() {
  const [id, setId] = createSignal(1)
  const response = useSWR<Character>(() => `https://rickandmortyapi.com/api/character/${id()}`, fetcher)

  return (
    <div class="container">
      <header>
        <h1>Shiwas <span>+</span> Solid</h1>
        <p>Ultra-lite SWR for the modern web</p>
      </header>

      <main>
        <div class="controls">
          <button onClick={() => setId(prev => Math.max(1, prev - 1))} disabled={id() <= 1}>Previous</button>
          <span class="id-badge">ID: {id()}</span>
          <button onClick={() => setId(prev => prev + 1)}>Next</button>
        </div>

        <div class="card-container">
          <Show when={!response.error} fallback={<div class="error">Failed to load character</div>}>
            <div class={`card ${response.isLoading ? 'loading' : ''}`}>
              <Show when={response.data} fallback={<div class="skeleton"></div>}>
                {(character) => (
                  <>
                    <div class="image-wrapper">
                      <img src={character().image} alt={character().name} />
                      <span class={`status-badge ${character().status.toLowerCase()}`}>
                        {character().status}
                      </span>
                    </div>
                    <div class="content">
                      <h2>{character().name}</h2>
                      <p class="species">{character().species}</p>
                      <div class="info">
                        <label>Last known location:</label>
                        <p>{character().location.name}</p>
                      </div>
                    </div>
                  </>
                )}
              </Show>
              <Show when={response.isValidating}>
                <div class="refresh-indicator">Updating...</div>
              </Show>
            </div>
          </Show>
        </div>
      </main>

      <footer>
        <p>Built with ❤️ and Shiwas</p>
      </footer>
    </div>
  )
}

export default App
