const GAS_URL = "https://script.google.com/macros/s/AKfycbwxh5tgD_dzUbX2GxQ2H0QraLRkQHNNSoVXUXWEZLXzdG823C6fP2Z4QOy_MUS_6btdog/exec";
let dataTable;

/* ===== Mobile Card State ===== */
let mobileData = [];
let originalMobileData = [];
let currentPage = 1;
const pageSize = 5;

/* ================= UTIL ================= */
function getCurrentThaiYear() {
  return (new Date().getFullYear() + 543).toString();
}

function updateCurrentYearBadge(year) {
  document.getElementById("currentYearBadge").style.display =
    year === getCurrentThaiYear() ? "inline-block" : "none";
}

/* ================= API ================= */
function api(action, payload = {}) {
  return fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify({ action, payload })
  }).then(res => res.json());
}

/* ================= NEW : PREPARE LOADING UI ================= */
/* ⭐ เพิ่มใหม่ : ซ่อน table / card แล้วแสดง spinner ทันที */
function prepareLoadingUI() {
  const spinner = document.getElementById("loadingSpinner");
  spinner.style.display = "block";

  if (window.innerWidth > 768) {
    // ===== Desktop =====
    $("#data-table").hide();

    if ($.fn.DataTable.isDataTable("#data-table")) {
      $("#data-table").DataTable().clear().destroy();
    }
  } else {
    // ===== Mobile =====
    document.getElementById("mobileCardContainer").innerHTML = "";
    document.getElementById("mobilePagination").innerHTML = "";
  }
}

/* ================= LOAD YEARS ================= */
function loadYears() {

  prepareLoadingUI(); // ⭐ แสดง spinner ทันที

  api("getYears").then(years => {

    const sel = document.getElementById("yearSelect");
    sel.innerHTML = "";

    years.sort((a, b) => b - a);

    years.forEach(y => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.text = y;
      sel.appendChild(opt);
    });

    const current = getCurrentThaiYear();
    sel.value = years.includes(current) ? current : years[0];

    loadData();
  });
}

/* ================= LOAD DATA ================= */
function loadData() {
  const year = document.getElementById("yearSelect").value;
  document.getElementById("titleYear").innerText =
    "ระบบสืบค้นคำสั่งโรงเรียนพิมานพิทยาสรรค์ ปี " + year;

  updateCurrentYearBadge(year);

  // ⭐ แสดง spinner + ซ่อน UI เดิม (Desktop & Mobile)
  prepareLoadingUI();

  api("getData", { year }).then(showData);
}

/* ================= FILE BUTTONS ================= */
function renderFileButtons(data) {
  if (!data) return "";

  let download = data;
  if (data.includes("drive.google.com")) {
    const id = data.match(/[-\w]{25,}/);
    if (id) {
      download = "https://drive.google.com/uc?export=download&id=" + id[0];
    }
  }

  return `
    <div class="d-flex justify-content-center">
      <a href="${data}" target="_blank"
         class="btn btn-sm btn-outline-primary mr-2">🔍</a>
      <a href="${download}"
         class="btn btn-sm btn-outline-success">📥</a>
    </div>
  `;
}

/* ================= MOBILE CARD ================= */
function renderMobileCardsPage() {

  const container = document.getElementById("mobileCardContainer");

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  const pageData = mobileData.slice(start, end);

  let html = "";

  for(let i=0;i<pageData.length;i++){

    const r = pageData[i];

    html += `
      <div class="mobile-card">

        <div class="card-row">
          <div class="card-label">คำสั่งที่</div>
          <div class="card-value">${r[0]}</div>
        </div>

        <div class="card-row">
          <div class="card-label">เรื่อง</div>
          <div class="card-value">${r[1]}</div>
        </div>

        <div class="card-row">
          <div class="card-label">สั่ง ณ วันที่</div>
          <div class="card-value">${r[2]}</div>
        </div>

        <div class="card-row">
          <div class="card-label">ไฟล์</div>
          <div class="card-value">${renderFileButtons(r[3])}</div>
        </div>

      </div>
    `;
  }

  container.innerHTML = html;

  renderMobilePagination();
}

function renderMobilePagination() {
  const totalPages = Math.ceil(mobileData.length / pageSize);
  const pag = document.getElementById("mobilePagination");
  pag.innerHTML = "";

  if (totalPages <= 1) return;

  pag.innerHTML = `
    <button class="btn btn-sm btn-outline-secondary mr-2"
      ${currentPage === 1 ? "disabled" : ""} 
      onclick="changeMobilePage(${currentPage - 1})">◀</button>
    หน้า ${currentPage} / ${totalPages}
    <button class="btn btn-sm btn-outline-secondary ml-2"
      ${currentPage === totalPages ? "disabled" : ""} 
      onclick="changeMobilePage(${currentPage + 1})">▶</button>
  `;
}

function changeMobilePage(p) {
  const spinner = document.getElementById("loadingSpinner");
  spinner.style.display = "block";

  setTimeout(() => {
    currentPage = p;
    renderMobileCardsPage();
    spinner.style.display = "none";
  }, 0);
}

/* ================= TABLE + CARD SWITCH ================= */
function showData(dataArray) {

  const spinner = document.getElementById("loadingSpinner");

  const fixedData = dataArray.map(r => [
    r[0],
    r[1],
    r[2],
    r[3]
  ]);

  /* ===== DESKTOP ===== */
  if (window.innerWidth > 768) {

    // ⭐ ป้องกัน DataTable ซ้อน
    if ($.fn.DataTable.isDataTable("#data-table")) {
      $("#data-table").DataTable().clear().destroy();
    }

    dataTable = $("#data-table").DataTable({

      data: fixedData,

      deferRender: true,
      processing: true,

      pageLength: 10,
      searchDelay: 500,

      autoWidth: false,
      pagingType: "simple",

      order: [[0, "desc"]],

      stateSave: true,

      columns: [
        { title: "คำสั่งที่", width: "10%" },
        { title: "เรื่อง", width: "55%" },
        { title: "สั่ง ณ วันที่", width: "20%" },
        { title: "ไฟล์", width: "15%" }
      ],

      columnDefs: [

        { targets: [0,2,3], className: "text-center" },

        { targets: 1, className: "text-left" },

        {
          targets: 3,
          orderable: false,
          render: function(data,type){
            if(type==="display"){
              return renderFileButtons(data);
            }
            return data;
          }
        }

      ],

      language:{
        processing:"กำลังโหลดข้อมูล...",
        search:"ค้นหา:",
        zeroRecords:"ไม่พบข้อมูล",
        emptyTable:"ไม่มีข้อมูล",
        paginate:{
          previous:"ก่อนหน้า",
          next:"ถัดไป"
        }
      }

    });

    // ⭐ ตรวจจับการค้นหา Desktop
dataTable.off('search.dt').on('search.dt', function () {

  const searchValue = dataTable.search();
  const resetBtn = document.getElementById("resetBtn");

  if (searchValue) {
    resetBtn.classList.remove("d-none");
  } else {
    resetBtn.classList.add("d-none");
  }

});

    $("#data-table").show();
    spinner.style.display = "none";

    return;
  }

  /* ===== MOBILE ===== */

  $("#data-table").hide();

  originalMobileData = fixedData.sort(
    (a, b) => Number(b[0]) - Number(a[0])
  );

  mobileData = [...originalMobileData];

  currentPage = 1;

  renderMobileCardsPage();

  spinner.style.display = "none";
}

/* ================= SAVE ================= */
function submitFormModal() {
  const commandNumber = commandNumberModal.value;
  const topic = topicModal.value;
  const orderDate = orderDateModal.value;
  const year = document.getElementById("yearSelect").value;
  const fileInput = fileInputModal;

  if (!commandNumber || !topic || !orderDate) {
    alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
    return;
  }

  function save(fileUrl) {
    api("save", { year, commandNumber, topic, orderDate, fileUrl })
      .then(() => {
        loadData();
        $("#newCommandModal").modal("hide");
        commandNumberModal.value = "";
        topicModal.value = "";
        orderDateModal.value = "";
        fileInputModal.value = "";
        const n = document.getElementById("saveNotification");
        n.style.display = "block";
        setTimeout(() => n.style.display = "none", 2500);
      });
  }

  if (fileInput.files.length > 0) {
    const f = fileInput.files[0];
    const r = new FileReader();
    r.onload = e =>
      api("upload", {
        name: f.name,
        mime: f.type,
        base64: e.target.result.split(",")[1]
      }).then(save);
    r.readAsDataURL(f);
  } else save("");
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", function () {
  loadYears();

  const resetBtn = document.getElementById("resetBtn");
  const mobileSearch = document.getElementById("mobileSearch");

  mobileSearch.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();

    if (!q) {
      mobileData = [...originalMobileData];
      resetBtn.classList.add("d-none");
    } else {
      mobileData = originalMobileData.filter(r =>
        r.join(" ").toLowerCase().includes(q)
      );
      resetBtn.classList.remove("d-none");
    }

    currentPage = 1;
    renderMobileCardsPage();
  });

resetBtn.addEventListener("click", () => {

  if (window.innerWidth <= 768) {

    mobileSearch.value = "";
    mobileData = [...originalMobileData];
    currentPage = 1;
    renderMobileCardsPage();

  } else {

    dataTable.search("").draw(); // รีเซ็ตค้นหา desktop

  }

  resetBtn.classList.add("d-none");

});
  
});
