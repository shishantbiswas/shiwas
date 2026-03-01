import { useSWRInfinite } from "shiwas/react"

// Example fetcher for infinite loading
const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  return response.json()
}

// Infinite loading example
function InfinitePosts() {
  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    (index: number, previousPageData: any) => {
      // Return URL for the page
      if (index === 0) {
        return '/api/posts?page=1'
      }
      // Get next page URL from previous page data
      return previousPageData?.nextPageUrl || null
    },
    fetcher,
    {
      initialSize: 1,
      revalidateAll: false
    }
  )

  const posts = data ? data.flat() : []
  const isLoadingMore = isLoading || (size > 0 && !data?.[size - 1])
  const isReachingEnd = data?.[data.length - 1]?.posts?.length === 0

  const loadMore = () => setSize(size + 1)

  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h1>Infinite Posts</h1>
      <div>
        {posts.map((post: any, index: number) => (
          <div key={post.id || index} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px' }}>
            <h3>{post.title}</h3>
            <p>{post.content}</p>
          </div>
        ))}
      </div>
      
      <button 
        onClick={loadMore} 
        disabled={isLoadingMore || isReachingEnd}
        style={{ padding: '10px 20px', margin: '10px 0' }}
      >
        {isLoadingMore ? 'Loading...' : isReachingEnd ? 'No more posts' : 'Load More'}
      </button>
      
      <div>Showing {posts.length} posts from {size} pages</div>
    </div>
  )
}

// Example with template literal keys
function PaginatedData() {
  const pageIndex = 1
  
  const { data, error, isLoading } = useSWRInfinite(
    (index: number) => [`/api/data?page=${index + 1}`],
    fetcher
  )

  return (
    <div>
      <h2>Paginated Data</h2>
      {data?.map((page: any[], pageIndex: number) => (
        <div key={pageIndex}>
          <h3>Page {pageIndex + 1}</h3>
          <ul>
            {page.map((item: any, itemIndex: number) => (
              <li key={itemIndex}>{item.name}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default function InfiniteExample() {
  return (
    <div>
      <InfinitePosts />
      <hr />
      <PaginatedData />
    </div>
  )
}
