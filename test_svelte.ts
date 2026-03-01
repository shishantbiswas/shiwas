import { get } from "svelte/store";
import { useSWR } from "./app/src/adapters/svelte/use-swr.ts";

const { data, error, isLoading } = useSWR(
  "https://jsonplaceholder.typicode.com/posts/2",
  (url: string) => fetch(url).then(res => res.json())
);

console.log(get(data));
setTimeout(() => console.log(get(isLoading), get(data)), 100);
setTimeout(() => console.log(get(isLoading), get(data)), 500);

