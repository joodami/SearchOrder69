const GAS_URL = "https://script.google.com/macros/s/AKfycbwxh5tgD_dzUbX2GxQ2H0QraLRkQHNNSoVXUXWEZLXzdG823C6fP2Z4QOy_MUS_6btdog/exec";
let dataTable;
let currentLimit = 200; // โหลดเริ่มต้น 200 แถว
let currentOffset = 0;  // offset สำหรับโหลดเพิ่ม
let currentData = [];   // เก็บข้อมูลเดิมเพื่อ append

/* ================= UTIL ================= */
function getCurrentThaiYear() {
  return (new Date().getFullYear() + 543).toString();
}

function updateCurrentYearBadge(year) {
  document.getElementById("currentYearBadge").style.display =
    year === getCurrentThaiYear() ? "inline-block" : "none";
}

/* ================= API ================= */
function api(action, payload={}) {
  return fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify({ action, payload })
  }).then(res => res.json());
}

/* ================= LOAD YEARS ================= */
function loadYears() {
  api("getYears").then(years => {
    const sel = document.getElementById("yearSelect");
    sel.innerHTML = "";
    years.sort((a,b)=>b-a);
    years.forEach(y=>{
      const opt = document.createElement("option");
      opt.value = y;
      opt.text = y;
      sel.appendChild(opt);
    });
    const current = getCurrentThaiYear();
    sel.value = years.includes(current) ? current : years[0];
    resetAndLoadData();
  });
}

/* ================= LOAD DATA ================= */
function resetAndLoadData() {
  currentOffset = 0;
  currentData = [];
  document.getElementById("loadMoreBtn").classList.add("d-none");
  loadData();
}

function loadData(limit = currentLimit) {
  const yearSelect = document.getElementById("yearSelect");
  const year = yearSelect.value;
  document.getElementById("titleYear").innerText = "ระบบสืบค้นคำสั่งโรงเรียนพิมานพิทยาสรรค์ ปี " + year;

  updateCurrentYearBadge(year);

  api("getData", { year, limit, offset: currentOffset }).then(dataArray => {
    if(!dataArray || dataArray.length === 0) return;

    currentData = currentData.concat(dataArray);

    if(!dataTable) {
      // สร้าง Table ครั้งแรก
      showData(currentData);
    } else {
      // append rows โดยไม่ destroy
      dataTable.rows.add(dataArray.map(r => [r[0], r[1], r[2], r[3]])).draw(false);
    }

    currentOffset += dataArray.length;

    // แสดงปุ่มโหลดเพิ่มเติมเฉพาะเมื่อข้อมูลเต็ม limit
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    if(dataArray.length === limit){
      loadMoreBtn.classList.remove("d-none");
    } else {
      loadMoreBtn.classList.add("d-none");
    }
  });
}

/* ================= TABLE ================= */
function showData(dataArray) {
  dataTable = $("#data-table").DataTable({
    data: dataArray.map(r => [r[0], r[1], r[2], r[3]]),
    
    /* ===== Performance ===== */
    deferRender: true,
    pageLength: 10,
    searchDelay: 600,
    autoWidth: false,

    /* ===== Responsive + Card ===== */
    responsive: {
      details: {
        renderer: function(api, rowIdx, columns) {
          if(window.innerWidth > 768) return false;

          let data = columns.map(col=>{
            if(col.hidden){
              return `
                <div class="card-row">
                  <div class="card-label">${col.title}</div>
                  <div class="card-value">${col.data}</div>
                </div>`;
            }
            return "";
          }).join("");

          return `<div class="mobile-card">${data}</div>`;
        }
      }
    },

    pagingType: "simple",
    order: [[0, "desc"]],

    columnDefs: [
      { targets: [0], responsivePriority: 1 },
      { targets: [1], responsivePriority: 2 },
      { targets: [2], responsivePriority: 3 },
      { targets: [3], responsivePriority: 4, orderable: false },

      { targets: [0,2,3], className: "text-center" },
      { targets: 1, className: "text-left" },

      {
        targets: 3,
        render: function(data,type){
          if(type==="display" && data){
            let download=data;
            if(data.includes("drive.google.com")){
              const id=data.match(/[-\w]{25,}/);
              if(id) download="https://drive.google.com/uc?export=download&id="+id[0];
            }
            return `
              <div class="d-flex justify-content-center">
                <a href="${data}" target="_blank" class="btn btn-sm btn-outline-primary mr-1">🔍</a>
                <a href="${download}" class="btn btn-sm btn-outline-success">📥</a>
              </div>`;
          }
          return "";
        }
      }
    ],

    columns: [
      { title: "คำสั่งที่" },
      { title: "เรื่อง" },
      { title: "สั่ง ณ วันที่" },
      { title: "ไฟล์" }
    ],

    language: {
      search: "ค้นหาคำสั่ง:",
      lengthMenu: "แสดง _MENU_ รายการ",
      info: "แสดง _START_ ถึง _END_ จากทั้งหมด _TOTAL_ รายการ",
      infoEmpty: "แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ",
      infoFiltered: "(กรองจากทั้งหมด _MAX_ รายการ)",
      zeroRecords: "ไม่พบข้อมูลที่ค้นหา",
      emptyTable: "ไม่มีข้อมูลในตาราง",
      paginate: {
        first: "หน้าแรก",
        previous: "ก่อนหน้า",
        next: "ถัดไป",
        last: "หน้าสุดท้าย"
      }
    }
  });

  dataTable.on("search.dt", function(){
    document.getElementById("resetBtn").classList.toggle("d-none", dataTable.search()==="");
  });
}

/* ================= SAVE ================= */
function submitFormModal() {
  const commandNumber = commandNumberModal.value;
  const topic = topicModal.value;
  const orderDate = orderDateModal.value;
  const year = document.getElementById("yearSelect").value;
  const fileInput = fileInputModal;

  if(!commandNumber || !topic || !orderDate){
    alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
    return;
  }

  function save(fileUrl){
    api("save", { year, commandNumber, topic, orderDate, fileUrl })
      .then(()=> {
        resetAndLoadData();
        $("#newCommandModal").modal("hide");
        commandNumberModal.value="";
        topicModal.value="";
        orderDateModal.value="";
        fileInputModal.value="";
        const n=document.getElementById("saveNotification");
        n.style.display="block";
        setTimeout(()=>n.style.display="none",2500);
      });
  }

  if(fileInput.files.length>0){
    const f=fileInput.files[0];
    const r=new FileReader();
    r.onload=e=>api("upload",{name:f.name,mime:f.type,base64:e.target.result.split(",")[1]}).then(save);
    r.readAsDataURL(f);
  } else save("");
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", function(){
  loadYears();

  document.getElementById("resetBtn").addEventListener("click", function(){
    if(dataTable) dataTable.search("").draw();
  });

  document.getElementById("loadMoreBtn").addEventListener("click", function(){
    loadData(currentLimit);
  });
});
