const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Exchange funcionando!');
});

app.listen(port, () => {
  console.log(`Exchange rodando em http://localhost:${port}`);
});

