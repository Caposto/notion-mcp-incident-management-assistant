import express from "express"

const app = express()
const port = 3000
const region = "unknown" // TODO set region in docker-compose
let healthy = true

app.get('/', (req, res) => {
  if (healthy) {
    return res.send(`Welcome to the Coffee Grinds Service! (${region})`);
  }
  res.status(500).json(
    {
      message: "There was an error processing your request.",
      code: "INTERNAL_SERVER_ERROR"
    }
  )
})

// Call this endpoint to simulate a failure
app.get('/set-state', (req, res) => {
  healthy = !healthy
  res.send(`Set state to ${healthy ? "Healthy" : "Down"}`)
})

app.listen(port, () => {
  console.log(`Coffee Grinds Service running on port ${port}`)
})