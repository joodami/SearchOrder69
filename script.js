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

/* ================= LOAD YEARS ================= */
function loadYears() {
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
  api("getData", { year }).then(showData);
}

/* ================= FILE BUTTONS (ใช้ร่วมกัน) ================= */
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
    <div class="d-flex">
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
  container.innerHTML = "";

  const start = (currentPage - 1) * pageSize;
  const pageData = mobileData.slice(start, start + pageSize);

  pageData.forEach(r => {
    container.innerHTML += `
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
  });

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
  currentPage = p;
  renderMobileCardsPage();
}

/* ================= TABLE ================= */
function showData(dataArray) {

  /* ===== Desktop Table (เดิม 100%) ===== */
  if ($.fn.DataTable.isDataTable("#data-table")) {
    $("#data-table").DataTable().clear().destroy();
  }

  const fixedData = dataArray.map(r => [r[0], r[1], r[2], r[3]]);

  dataTable = $("#data-table").DataTable({
    data: fixedData,
    deferRender: true,
    pageLength: 10,
    searchDelay: 600,
    autoWidth: false,
    pagingType: "simple",
    order: [[0, "desc"]],

    columns: [
      { title: "คำสั่งที่" },
      { title: "เรื่อง" },
      { title: "สั่ง ณ วันที่" },
      { title: "ไฟล์" }
    ],

    columnDefs: [
      { targets: [0, 2, 3], className: "text-center" },
      { targets: 1, className: "text-left" },
      {
        targets: 3,
        orderable: false,
        render: function (data, type) {
          if (type === "display") return renderFileButtons(data);
          return data;
        }
      }
    ],

    language: {
      search: "ค้นหาคำสั่ง:",
      lengthMenu: "แสดง _MENU_ รายการ",
      info: "แสดง _START_ ถึง _END_ จากทั้งหมด _TOTAL_ รายการ",
      zeroRecords: "ไม่พบข้อมูล",
      emptyTable: "ไม่มีข้อมูล",
      paginate: {
        previous: "ก่อนหน้า",
        next: "ถัดไป"
      }
    }
  });

  /* ===== Mobile Card ===== */
  if (window.innerWidth <= 768) {
    $("#data-table").hide();
    originalMobileData = [...fixedData];
    mobileData = [...fixedData];
    currentPage = 1;
    renderMobileCardsPage();
  } else {
    $("#data-table").show();
  }
}

/* ================= SAVE (เดิม 100%) ================= */
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

  document.getElementById("mobileSearch").addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    mobileData = originalMobileData.filter(r =>
      r.join(" ").toLowerCase().includes(q)
    );
    currentPage = 1;
    renderMobileCardsPage();
  });
});
