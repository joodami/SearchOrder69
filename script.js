const GAS_URL = "https://script.google.com/macros/s/AKfycbwxh5tgD_dzUbX2GxQ2H0QraLRkQHNNSoVXUXWEZLXzdG823C6fP2Z4QOy_MUS_6btdog/exec";
let dataTable;

/* ================= UTIL ================= */
function getCurrentThaiYear() {
  return (new Date().getFullYear() + 543).toString();
}

function formatThaiDate(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toLocaleDateString("th-TH", { day:"numeric", month:"long", year:"numeric" });
  if (typeof value === "string" && value.includes("T")) return new Date(value).toLocaleDateString("th-TH", { day:"numeric", month:"long", year:"numeric" });
  return value;
}

function updateCurrentYearBadge(year) {
  document.getElementById("currentYearBadge").style.display =
    year === getCurrentThaiYear() ? "inline-block" : "none";
}

/* ================= API ================= */
function api(action, payload={}) {
  return fetch(GAS_URL, {
    method:"POST",
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
      opt.value=y;
      opt.text=y;
      sel.appendChild(opt);
    });

    const current = getCurrentThaiYear();
    sel.value = years.includes(current) ? current : years[0];
    loadData();
  });
}

/* ================= LOAD DATA ================= */
function loadData() {
  const yearSelect = document.getElementById("yearSelect");
  const year = yearSelect.value;
  document.getElementById("titleYear").innerText = "ระบบสืบค้นคำสั่งโรงเรียนพิมานพิทยาสรรค์ ปี " + year;
  updateCurrentYearBadge(year);

  api("getData", { year }).then(showData);
}

/* ================= TABLE ================= */
function showData(dataArray) {
  if ($.fn.DataTable.isDataTable("#data-table")) $("#data-table").DataTable().clear().destroy();

  const fixedData = dataArray.map(r => [ r[0], r[1], formatThaiDate(r[2]), r[3] ]);

  dataTable = $("#data-table").DataTable({
    data: fixedData,
    order:[[0,"desc"]],
    columns:[
      { title:"คำสั่งที่" },
      { title:"เรื่อง" },
      { title:"สั่ง ณ วันที่" },
      {
        title:"ไฟล์",
        render: function(data){
          if(!data) return "";
          let download = data;
          const id = data.match(/[-\w]{25,}/);
          if(id) download="https://drive.google.com/uc?export=download&id="+id[0];
          return `<a href="${data}" target="_blank" class="btn btn-sm btn-outline-primary mr-1">🔍</a>
                  <a href="${download}" class="btn btn-sm btn-outline-success">📥</a>`;
        }
      }
    ],
    language:{
      search:"ค้นหาคำสั่ง:",
      lengthMenu:"แสดง _MENU_ รายการ",
      info:"แสดง _START_ ถึง _END_ จากทั้งหมด _TOTAL_ รายการ",
      infoEmpty:"แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ",
      infoFiltered:"(กรองจากทั้งหมด _MAX_ รายการ)",
      zeroRecords:"ไม่พบข้อมูลที่ค้นหา",
      emptyTable:"ไม่มีข้อมูลในตาราง",
      paginate:{first:"หน้าแรก",previous:"ก่อนหน้า",next:"ถัดไป",last:"หน้าสุดท้าย"}
    }
  });

  dataTable.on("search.dt", ()=>{
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
      .then(()=>{
        loadData();
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
});
