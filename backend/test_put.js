const axios = require('axios');
async function test() {
  try {
    const res = await axios.put('http://127.0.0.1:8000/admin/expenses/de97fdc8-f3f6-472d-84fc-ce345e84c79d', {
      site_id: "some-uuid",
      user_id: "some-uuid",
      category: "Cazare",
      amount: 500,
      currency: "RON",
      date: "2026-07-21",
      description: "test",
      document_url: ""
    }, {
      headers: {
        'Authorization': 'Bearer test' // Might fail 401, but we want to see if 422 happens first! Wait, 401 happens before 422 in FastAPI.
      }
    });
    console.log(res.data);
  } catch (e) {
    console.log(e.response?.status, e.response?.data);
  }
}
test();
