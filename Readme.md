# WHATIS

https://meshtastic.taubetele.com/


Not a pet. Not a product-grade. Just a try to educate `@kkwestt` to read this `Readme.md` and notify `@zwoelf` if it's read.

# Config it

```bash
cat server.js
```

```js
export const useServer = () => {
  // const theOnlyOne = 'https://api.meshtasticback.taubetele.com' // poka tak v prode
  const theOnlyOne = 'http://localhost' // poka tak v deve
  return {
    theOnlyOne
  }
}
```