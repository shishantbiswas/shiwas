import './style.css'
import { createSWR } from 'shiwas'

const swr = createSWR()
const app = document.querySelector<HTMLDivElement>('#app')!

interface User {
  name: { first: string; last: string }
  email: string
  picture: { large: string }
  location: { city: string; country: string }
}

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(data => data.results[0])

function render(data?: User, error?: any, isValidating?: boolean) {
  app.innerHTML = `
    <div class="container">
      <header>
        <h1>Shiwas <span>+</span> HTML</h1>
        <p>Direct Core SWR for any project</p>
      </header>

      <main>
        <div class="controls">
          <button id="refresh">Fetch Random User</button>
        </div>

        <div class="card-container">
          ${error ? `<div class="error">Failed to load user</div>` : `
            <div class="card ${!data ? 'loading' : ''}">
              ${data ? `
                <div class="image-wrapper">
                  <img src="${data.picture.large}" alt="${data.name.first}" />
                </div>
                <div class="content">
                  <h2>${data.name.first} ${data.name.last}</h2>
                  <p class="email">${data.email}</p>
                  <div class="info">
                    <label>Location:</label>
                    <p>${data.location.city}, ${data.location.country}</p>
                  </div>
                </div>
              ` : `<div class="skeleton"></div>`}
              ${isValidating ? `<div class="refresh-indicator">Updating...</div>` : ''}
            </div>
          `}
        </div>
      </main>

      <footer>
        <p>Built with ❤️ and Shiwas Core</p>
      </footer>
    </div>
  `

  document.querySelector('#refresh')?.addEventListener('click', () => {
    swr.revalidate('random-user')
  })
}

// Initial render
render()

// Subscribe to SWR
swr.subscribe('random-user', (data: any, error: any, isValidating: boolean) => {
  render(data, error, isValidating)
}, fetcher as any)

// Trigger initial fetch
swr.revalidate('random-user', { fetcher: fetcher as any })
