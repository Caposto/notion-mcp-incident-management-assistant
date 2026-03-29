import express from "express"

const app = express()
const port = 3001

app.get('/', (req, res) => {
  res.send("Welcome to the Coffee Grinds Service!")
})

app.listen(port, () => {
  console.log(`Coffee Grinds Service running on port ${port}`)
})