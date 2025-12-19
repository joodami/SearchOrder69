const GAS_URL = "https://script.google.com/macros/s/AKfycbwxh5tgD_dzUbX2GxQ2H0QraLRkQHNNSoVXUXWEZLXzdG823C6fP2Z4QOy_MUS_6btdog/exec"; // ✅ ใส่ URL ของคุณ
let dataTable;

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

  const fixedData = dataArray.map(r => [
    r[0], // คำสั่งที่
    r[1], // เรื่อง
    r[2], // สั่ง ณ วันที่ เป็น string จาก Sheet
    r[3]  // ไฟล์
  ]);

  dataTable = $("#data-table").DataTable({
    data: fixedData,
    autoWidth:false,
    responsive:false,
    pagingType:"full_numbers",
    order:[[0,"desc"]],
    columnDefs:[
      {targets:[0,2,3], className:"text-center"},
      {targets:1, className:"text-left"},
      {targets:3, render: function(data,type){
        if(type==="display" && data){
          let download = data;
          if(data.includes("drive.google.com")){
            const id = data.match(/[-\w]{25,}/);
            if(id) download="https://drive.google.com/uc?export=download&id="+id[0];
          }
          return `<div class="d-flex justify-content-center">
                    <a href="${data}" target="_blank" class="btn btn-sm btn-outline-primary mr-1">🔍</a>
                    <a href="${download}" class="btn btn-sm btn-outline-success">📥</a>
                  </div>`;
        }
        return "";
      }}
    ],
    columns:[
      { title:"คำสั่งที่", width:"8%" },
      { title:"เรื่อง", width:"50%" },
      { title:"สั่ง ณ วันที่", width:"15%" },
      { title:"ไฟล์", width:"12%" }
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
