const http = require('http');
http.get('http://localhost:3000/api/search?query=naruto', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('RESPONSE:', data.substring(0, 500)));
}).on('error', err => console.error(err));
