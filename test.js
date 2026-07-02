const http = require('http');

http.get('http://127.0.0.1:6001/api/version', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Backend response:', res.statusCode, data);
  });
}).on('error', (err) => {
  console.error('Backend error:', err.message);
});

http.get('http://127.0.0.1:5679/api/version', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Frontend Proxy response:', res.statusCode, data);
  });
}).on('error', (err) => {
  console.error('Frontend Proxy error:', err.message);
});
