const GAS_URL = "https://script.google.com/macros/s/AKfycbz4JDg8S93MpHcgx4dXK1ISLHXcYXT_AoMvcxfIUSaPAPRAXH-3prCtv9CBYONLMWVyDQ/exec";
let dataTable;

function thaiYear() {
  return (new Date().getFullYear() + 543).toString();
}

function api(action, payload = {}) {
  return fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify({ action, payload })
  }).then(r => r.json());
}

function loadYears() {
  api("getYears").then(years => {
    const y = document.getElementById("yearSelect");
    y.innerHTML = "";
    years.sort((a,b)=>b-a).forEach(v=>{
      y.innerHTML += `<option>${v}</option>`;
    });
    y.value = years.includes(thaiYear()) ? thaiYear() : years[0];
    loadData();
  });
}

function loadData() {
  const year = yearSelect.value;
  api("getData", {year}).then(showTable);
}

function showTable(data) {
  if ($.fn.DataTable.isDataTable('#data-table')) {
    $('#data-table').DataTable().destroy();
  }
  dataTable = $('#data-table').DataTable({
    data,
    columns: [
      { title:"คำสั่งที่" },
      { title:"เรื่อง" },
      { title:"วันที่" },
      { title:"ไฟล์",
        render:d=> d ? `<a href="${d}" target="_blank">📄</a>` : ""
      }
    ]
  });
}

function submitFormModal() {
  const fd = {
    year: yearSelect.value,
    commandNumber: commandNumberModal.value,
    topic: topicModal.value,
    orderDate: orderDateModal.value
  };

  const file = fileInputModal.files[0];
  if (!file) return save(fd, "");

  const r = new FileReader();
  r.onload = e=>{
    api("upload", {
      name:file.name,
      mime:file.type,
      base64:e.target.result.split(",")[1]
    }).then(url=>save(fd,url));
  };
  r.readAsDataURL(file);
}

function save(data,fileUrl){
  data.fileUrl = fileUrl;
  api("save", data).then(()=>{
    $('#newCommandModal').modal('hide');
    loadData();
    saveNotification.style.display="block";
    setTimeout(()=>saveNotification.style.display="none",2000);
  });
}

document.addEventListener("DOMContentLoaded", loadYears);
