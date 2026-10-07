/* ZayneTutor Tutor Management System
   Front-end/localStorage version. It can later be connected to Node/Express/MySQL.
*/
const STORAGE = "zaynetutor_manager_v1";

const defaultData = {
  settings: {
    tutorName: "Saymore Muchenje",
    businessName: "ZayneTutor",
    phone: "",
    email: "",
    currency: "R"
  },
  students: [
    {id:101,name:"John Moyo",grade:"7",subject:"Mathematics",phone:"",guardian:"",fee:600,status:"Active"},
    {id:102,name:"Sarah Dube",grade:"8",subject:"English",phone:"",guardian:"",fee:450,status:"Active"},
    {id:103,name:"Peter Ncube",grade:"6",subject:"Mathematics",phone:"",guardian:"",fee:800,status:"Active"},
    {id:104,name:"Mary Sibanda",grade:"9",subject:"Science",phone:"",guardian:"",fee:500,status:"Active"},
    {id:105,name:"David Moyo",grade:"7",subject:"Mathematics",phone:"",guardian:"",fee:700,status:"Active"},
    {id:106,name:"Thandiwe Khumalo",grade:"8",subject:"English",phone:"",guardian:"",fee:650,status:"Active"}
  ],
  payments: [
    {id:1,studentId:101,month:"2026-10",amount:600,status:"Paid",date:"2026-10-12",note:""},
    {id:2,studentId:102,month:"2026-10",amount:450,status:"Paid",date:"2026-10-12",note:""},
    {id:3,studentId:103,month:"2026-10",amount:0,status:"Unpaid",date:"",note:""},
    {id:4,studentId:104,month:"2026-10",amount:500,status:"Paid",date:"2026-10-11",note:""},
    {id:5,studentId:105,month:"2026-10",amount:350,status:"Partial",date:"2026-10-10",note:"Part payment"},
    {id:6,studentId:106,month:"2026-10",amount:650,status:"Paid",date:"2026-10-10",note:""}
  ],
  grades: [
    {id:1,studentId:101,term:"Term 1",assessment:"Test 1",score:72,max:100,date:"2026-03-10"},
    {id:2,studentId:101,term:"Term 1",assessment:"Assignment",score:80,max:100,date:"2026-03-25"},
    {id:3,studentId:101,term:"Term 2",assessment:"Test 1",score:78,max:100,date:"2026-06-12"},
    {id:4,studentId:101,term:"Term 3",assessment:"Test 1",score:84,max:100,date:"2026-09-15"},
    {id:5,studentId:102,term:"Term 1",assessment:"Essay",score:75,max:100,date:"2026-03-18"},
    {id:6,studentId:103,term:"Term 2",assessment:"Test 1",score:82,max:100,date:"2026-06-15"},
    {id:7,studentId:104,term:"Term 3",assessment:"Project",score:88,max:100,date:"2026-09-20"}
  ],
  invoices: []
};

let data = loadData();
let currentMonth = new Date().toISOString().slice(0,7);
let currentPage = "dashboard";

function loadData(){
  try{
    const saved = localStorage.getItem(STORAGE);
    if(saved) return JSON.parse(saved);
  }catch(e){}
  return structuredClone(defaultData);
}
function save(){ localStorage.setItem(STORAGE, JSON.stringify(data)); }
function money(n){ return `${data.settings.currency || "R"}${Number(n||0).toLocaleString("en-ZA",{minimumFractionDigits:0,maximumFractionDigits:2})}`; }
function monthName(m){
  const [y,mo] = m.split("-"); return new Date(Number(y),Number(mo)-1,1).toLocaleString("en-ZA",{month:"long",year:"numeric"});
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function student(id){return data.students.find(s=>s.id==id)}
function initials(name){return name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}
function paymentsFor(month=currentMonth){return data.students.map(s=>paymentFor(s.id,month))}
function paymentFor(studentId,month=currentMonth){
  return data.payments.find(p=>p.studentId==studentId && p.month===month) || {
    id:null,studentId,month,amount:0,status:"Unpaid",date:"",note:""
  };
}
function expected(month=currentMonth){
  return data.students.filter(s=>s.status==="Active").reduce((a,s)=>a+Number(s.fee||0),0);
}
function received(month=currentMonth){
  return data.payments.filter(p=>p.month===month).reduce((a,p)=>a+Number(p.amount||0),0);
}
function outstanding(month=currentMonth){return Math.max(expected(month)-received(month),0)}
function statusFor(p,s){
  const a=Number(p.amount||0), f=Number(s.fee||0);
  if(a>=f && f>0) return "Paid";
  if(a>0) return "Partial";
  return "Unpaid";
}
function showToast(msg){
  const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2400);
}
function openModal(html){
  document.getElementById("modal").innerHTML=html;
  document.getElementById("modalBackdrop").classList.add("show");
}
function closeModal(){document.getElementById("modalBackdrop").classList.remove("show")}
function pageHeader(title,sub,buttons=""){
  return `<div class="page-title"><div><h1>${title}</h1><p>${sub}</p></div><div class="actions">${buttons}</div></div>`;
}
function renderAll(){renderDashboard();renderStudents();renderGrades();renderPayments();renderInvoices();renderReports();renderSettings();updateTop();}

function updateTop(){
  document.getElementById("tutorNameTop").textContent=data.settings.tutorName||"Tutor";
  const count=paymentsFor().filter(p=>statusFor(p,student(p.studentId))!=="Paid").length;
  document.getElementById("notificationCount").textContent=count;
  document.getElementById("notificationCount").style.display=count?"grid":"none";
}
function renderDashboard(){
  const ex=expected(), rec=received(), out=outstanding();
  const active=data.students.filter(s=>s.status==="Active").length;
  const ps=paymentsFor().map(p=>({...p,computed:statusFor(p,student(p.studentId))}));
  const paid=ps.filter(p=>p.computed==="Paid").length;
  const rate=active?Math.round((rec/ex)*100):0;
  const bars=[["Jul","13500","11200"],["Aug","15000","12600"],["Sep","15400","14100"],["Oct",String(ex),String(rec)]];
  const max=Math.max(...bars.flatMap(x=>[Number(x[1]),Number(x[2])]),1);
  document.getElementById("page-dashboard").innerHTML=`
    ${pageHeader(`Good morning, ${esc((data.settings.tutorName||"Tutor").split(" ")[0])}!`,`Here's an overview of your tutoring business for ${monthName(currentMonth)}.`,`<input type="month" id="dashMonth" value="${currentMonth}" style="width:170px">`)}
    <div class="cards">
      <div class="card kpi blue"><div class="kpi-top"><span>Total Students</span><div class="kpi-icon">♟</div></div><h3>${active}</h3><p>Active students</p><div class="sub">${data.students.length} total records</div></div>
      <div class="card kpi green"><div class="kpi-top"><span>Expected Income</span><div class="kpi-icon">R</div></div><h3>${money(ex)}</h3><p>Individual student fees</p><div class="sub">${active} active students</div></div>
      <div class="card kpi blue"><div class="kpi-top"><span>Paid This Month</span><div class="kpi-icon">✓</div></div><h3>${money(rec)}</h3><p>${paid} students fully paid</p><div class="sub">${ex?Math.round(rec/ex*100):0}% collected</div></div>
      <div class="card kpi red"><div class="kpi-top"><span>Outstanding</span><div class="kpi-icon">!</div></div><h3>${money(out)}</h3><p>${ps.filter(p=>p.computed!=="Paid").length} students need follow-up</p><div class="sub" style="color:var(--red)">Needs attention</div></div>
      <div class="card kpi orange"><div class="kpi-top"><span>Collection Rate</span><div class="kpi-icon">%</div></div><h3>${rate}%</h3><p>Monthly collection</p><div class="sub">${paid} / ${active} fully paid</div></div>
    </div>
    <div class="dashboard-grid">
      <div class="panel wide">
        <div class="panel-head"><h2>Income Overview</h2><span>${monthName(currentMonth)}</span></div>
        <div class="metric-row"><div class="mini-metric"><small>Expected</small><strong>${money(ex)}</strong></div><div class="mini-metric"><small>Received</small><strong style="color:var(--green)">${money(rec)}</strong></div><div class="mini-metric"><small>Outstanding</small><strong style="color:var(--red)">${money(out)}</strong></div></div>
        <div class="bar-chart">${bars.map(b=>`<div class="bar-col"><div class="bar expected" title="Expected ${money(b[1])}" style="height:${Math.max(3,Number(b[1])/max*150)}px"></div><div class="bar received" title="Received ${money(b[2])}" style="height:${Math.max(3,Number(b[2])/max*150)}px"></div></div>`).join("")}</div>
        <div class="bar-labels">${bars.map(b=>`<span>${b[0]}</span>`).join("")}</div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Quick Actions</h2></div>
        <div class="quick-actions">
          <button class="btn btn-primary" onclick="openStudentModal()">＋ Add Student</button>
          <button class="btn" onclick="openPaymentModal()">▣ Record Payment</button>
          <button class="btn" onclick="openInvoiceModal()">▧ Create Invoice</button>
          <button class="btn btn-whatsapp" onclick="openInvoiceModal()">◉ Send WhatsApp Invoice</button>
        </div>
        <div class="panel-head" style="margin-top:22px"><h2>Reminders</h2></div>
        ${ps.filter(p=>p.computed!=="Paid").slice(0,4).map(p=>{const s=student(p.studentId);return `<div class="reminder"><strong>${esc(s.name)}</strong><span>${p.computed==="Partial"?money(s.fee-p.amount)+" still due":"Due "+money(s.fee)} · ${monthName(currentMonth)}</span></div>`}).join("") || `<div class="empty">All payments are up to date.</div>`}
      </div>
      <div class="panel wide">
        <div class="panel-head"><h2>Recent Payments</h2><button class="btn btn-sm" onclick="navigate('payments')">View all</button></div>
        <div class="table-wrap"><table><thead><tr><th>Date</th><th>Student</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>
        ${data.payments.filter(p=>p.month===currentMonth).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(p=>{const s=student(p.studentId);if(!s)return"";const st=statusFor(p,s);return `<tr><td>${p.date||"—"}</td><td><b>${esc(s.name)}</b></td><td>${money(p.amount)}</td><td><span class="status ${st.toLowerCase()}">${st}</span></td><td><button class="btn btn-sm btn-whatsapp" onclick="openInvoiceModal(${s.id},'${currentMonth}')">Send Invoice</button></td></tr>`}).join("") || `<tr><td colspan="5"><div class="empty">No payments recorded.</div></td></tr>`}
        </tbody></table></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Recent Students</h2><button class="btn btn-sm" onclick="navigate('students')">View all</button></div>
        <div class="student-list">${data.students.slice(-6).reverse().map(s=>`<div class="student-item"><div class="student-avatar">${initials(s.name)}</div><div class="student-info"><strong>${esc(s.name)}</strong><small>Grade ${esc(s.grade)} · ${esc(s.subject)}</small></div><span class="status active">${s.status}</span></div>`).join("")}</div>
      </div>
    </div>
    <div class="highlight"><div class="highlight-icon">🎯</div><div><strong>${money(ex)}</strong><span> is your expected income for ${monthName(currentMonth)}.</span><small>Each student's own monthly fee is included automatically.</small></div></div>`;
  document.getElementById("dashMonth").onchange=e=>{currentMonth=e.target.value;renderAll()};
}

function renderStudents(){
  document.getElementById("page-students").innerHTML=`
  ${pageHeader("Students","Manage students, individual fees and contact details.",`<button class="btn btn-primary" onclick="openStudentModal()">＋ Add Student</button>`)}
  <div class="filterbar"><div class="field" style="flex:1;min-width:230px"><input id="studentSearch" type="search" placeholder="Search name, grade or subject..."></div><select id="studentStatus" style="width:150px"><option>All</option><option>Active</option><option>Inactive</option></select></div>
  <div class="table-wrap"><table><thead><tr><th>Student</th><th>Grade</th><th>Subject</th><th>Monthly Fee</th><th>Guardian / WhatsApp</th><th>Status</th><th>Actions</th></tr></thead><tbody id="studentsBody"></tbody></table></div>`;
  filterStudents();
  document.getElementById("studentSearch").oninput=filterStudents;
  document.getElementById("studentStatus").onchange=filterStudents;
}
function filterStudents(){
  const q=(document.getElementById("studentSearch")?.value||"").toLowerCase(), st=document.getElementById("studentStatus")?.value||"All";
  const rows=data.students.filter(s=>(!q||`${s.name} ${s.grade} ${s.subject}`.toLowerCase().includes(q))&&(st==="All"||s.status===st));
  document.getElementById("studentsBody").innerHTML=rows.map(s=>`<tr><td><div style="display:flex;align-items:center;gap:9px"><div class="student-avatar">${initials(s.name)}</div><b>${esc(s.name)}</b></div></td><td>${esc(s.grade)}</td><td>${esc(s.subject)}</td><td><b>${money(s.fee)}</b></td><td>${esc(s.guardian||"—")}<br><small class="muted">${esc(s.phone||"No WhatsApp")}</small></td><td><span class="status ${s.status.toLowerCase()}">${s.status}</span></td><td><button class="btn btn-sm" onclick="openStudentModal(${s.id})">Edit</button> <button class="btn btn-sm" onclick="viewStudent(${s.id})">View</button></td></tr>`).join("")||`<tr><td colspan="7"><div class="empty">No students found.</div></td></tr>`;
}

function openStudentModal(id=null){
  const s=id?student(id):{name:"",grade:"",subject:"Mathematics",phone:"",guardian:"",fee:"",status:"Active"};
  openModal(`<div class="modal-head"><div><h2>${id?"Edit Student":"Add Student"}</h2><p class="modal-sub">${id?"Update this student's details and individual monthly fee.":"Each student can have a different monthly fee."}</p></div><button class="close" onclick="closeModal()">×</button></div>
  <form id="studentForm"><div class="form-grid">
    <div><label>Student Name *</label><input name="name" required value="${esc(s.name)}"></div>
    <div><label>Grade *</label><input name="grade" required value="${esc(s.grade)}" placeholder="e.g. 7"></div>
    <div><label>Subject *</label><input name="subject" required value="${esc(s.subject)}"></div>
    <div><label>Monthly Fee (${esc(data.settings.currency)}) *</label><input name="fee" type="number" min="0" step="0.01" required value="${s.fee}"></div>
    <div><label>Parent / Guardian</label><input name="guardian" value="${esc(s.guardian)}"></div>
    <div><label>WhatsApp Number</label><input name="phone" type="tel" value="${esc(s.phone)}" placeholder="+27..."></div>
    <div><label>Status</label><select name="status"><option ${s.status==="Active"?"selected":""}>Active</option><option ${s.status==="Inactive"?"selected":""}>Inactive</option></select></div>
  </div><div class="modal-actions"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary">${id?"Save Changes":"Add Student"}</button></div></form>`);
  document.getElementById("studentForm").onsubmit=e=>{
    e.preventDefault();const f=new FormData(e.target);
    const obj={name:f.get("name").trim(),grade:f.get("grade").trim(),subject:f.get("subject").trim(),fee:Number(f.get("fee")),guardian:f.get("guardian").trim(),phone:f.get("phone").trim(),status:f.get("status")};
    if(id) Object.assign(student(id),obj); else data.students.push({id:Date.now(),...obj});
    save();closeModal();renderAll();showToast(id?"Student updated":"Student added");
  };
}
function viewStudent(id){
  const s=student(id), grades=data.grades.filter(g=>g.studentId==id), avg=grades.length?Math.round(grades.reduce((a,g)=>a+(g.score/g.max*100),0)/grades.length):0;
  openModal(`<div class="modal-head"><div><h2>${esc(s.name)}</h2><p class="modal-sub">Grade ${esc(s.grade)} · ${esc(s.subject)} · ${money(s.fee)}/month</p></div><button class="close" onclick="closeModal()">×</button></div>
  <div class="metric-row"><div class="mini-metric"><small>Monthly Fee</small><strong>${money(s.fee)}</strong></div><div class="mini-metric"><small>Current Average</small><strong>${avg}%</strong></div><div class="mini-metric"><small>October</small><strong>${statusFor(paymentFor(id),s)}</strong></div></div>
  <h3>Recent Grades</h3><div class="table-wrap"><table><thead><tr><th>Term</th><th>Assessment</th><th>Score</th><th>Date</th></tr></thead><tbody>${grades.slice(-8).reverse().map(g=>`<tr><td>${esc(g.term)}</td><td>${esc(g.assessment)}</td><td>${g.score}/${g.max} (${Math.round(g.score/g.max*100)}%)</td><td>${g.date||"—"}</td></tr>`).join("")||`<tr><td colspan="4">No grades recorded.</td></tr>`}</tbody></table></div>
  <div class="modal-actions"><button class="btn" onclick="closeModal();openStudentModal(${id})">Edit Student</button><button class="btn btn-primary" onclick="closeModal();openPaymentModal(${id})">Record Payment</button></div>`);
}

function renderGrades(){
  document.getElementById("page-grades").innerHTML=`${pageHeader("Grades","Record and review your students' academic performance.",`<button class="btn btn-primary" onclick="openGradeModal()">＋ Record Grade</button>`)}
  <div class="grade-grid">${data.students.map(s=>{
    const gs=data.grades.filter(g=>g.studentId==s.id), avg=gs.length?Math.round(gs.reduce((a,g)=>a+(g.score/g.max*100),0)/gs.length):0;
    return `<div class="card grade-card"><div style="display:flex;align-items:center;gap:10px"><div class="student-avatar">${initials(s.name)}</div><div><h3>${esc(s.name)}</h3><p>Grade ${esc(s.grade)} · ${esc(s.subject)}</p></div></div><div class="average">${avg}%</div><p>${gs.length} assessments recorded</p><div class="progress" style="margin-top:9px"><i style="width:${avg}%"></i></div><button class="btn btn-sm" style="margin-top:14px" onclick="viewGrades(${s.id})">View Grades</button></div>`;
  }).join("")||`<div class="empty">Add students first.</div>`}</div>`;
}
function openGradeModal(id=null){
  openModal(`<div class="modal-head"><div><h2>Record Grade</h2><p class="modal-sub">Add a test, assignment, exam or other assessment.</p></div><button class="close" onclick="closeModal()">×</button></div>
  <form id="gradeForm"><div class="form-grid"><div class="full"><label>Student *</label><select name="studentId" required>${data.students.map(s=>`<option value="${s.id}" ${id==s.id?"selected":""}>${esc(s.name)} — Grade ${esc(s.grade)}</option>`).join("")}</select></div><div><label>Term</label><select name="term"><option>Term 1</option><option>Term 2</option><option>Term 3</option></select></div><div><label>Assessment</label><input name="assessment" required placeholder="Test 1"></div><div><label>Score</label><input name="score" type="number" min="0" required></div><div><label>Maximum</label><input name="max" type="number" min="1" value="100" required></div><div><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></div></div><div class="modal-actions"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary">Save Grade</button></div></form>`);
  document.getElementById("gradeForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);data.grades.push({id:Date.now(),studentId:Number(f.get("studentId")),term:f.get("term"),assessment:f.get("assessment"),score:Number(f.get("score")),max:Number(f.get("max")),date:f.get("date")});save();closeModal();renderAll();showToast("Grade recorded")};
}
function viewGrades(id){
  const s=student(id), gs=data.grades.filter(g=>g.studentId==id);
  openModal(`<div class="modal-head"><div><h2>${esc(s.name)} — Grades</h2><p class="modal-sub">Grade ${esc(s.grade)} · ${esc(s.subject)}</p></div><button class="close" onclick="closeModal()">×</button></div>
  <div class="table-wrap"><table><thead><tr><th>Term</th><th>Assessment</th><th>Score</th><th>%</th><th>Date</th><th></th></tr></thead><tbody>${gs.slice().reverse().map(g=>`<tr><td>${esc(g.term)}</td><td>${esc(g.assessment)}</td><td>${g.score}/${g.max}</td><td>${Math.round(g.score/g.max*100)}%</td><td>${g.date}</td><td><button class="btn btn-sm btn-danger" onclick="deleteGrade(${g.id},${id})">Delete</button></td></tr>`).join("")||`<tr><td colspan="6">No grades yet.</td></tr>`}</tbody></table></div><div class="modal-actions"><button class="btn btn-primary" onclick="closeModal();openGradeModal(${id})">＋ Add Grade</button></div>`);
}
function deleteGrade(gid,sid){data.grades=data.grades.filter(g=>g.id!=gid);save();closeModal();renderAll();viewGrades(sid);showToast("Grade deleted")}

function renderPayments(){
  const ps=paymentsFor();
  document.getElementById("page-payments").innerHTML=`${pageHeader("Payments","Mark each student's payment for the selected month.",`<input type="month" id="payMonth" value="${currentMonth}" style="width:170px"><button class="btn btn-primary" onclick="openPaymentModal()">＋ Record Payment</button>`)}
  <div class="cards" style="margin-bottom:15px"><div class="card kpi green"><div class="kpi-top"><span>Expected</span><div class="kpi-icon">R</div></div><h3>${money(expected())}</h3></div><div class="card kpi blue"><div class="kpi-top"><span>Received</span><div class="kpi-icon">✓</div></div><h3>${money(received())}</h3></div><div class="card kpi red"><div class="kpi-top"><span>Outstanding</span><div class="kpi-icon">!</div></div><h3>${money(outstanding())}</h3></div><div class="card kpi orange"><div class="kpi-top"><span>Fully Paid</span><div class="kpi-icon">%</div></div><h3>${ps.filter(p=>statusFor(p,student(p.studentId))==="Paid").length}</h3></div></div>
  <div class="table-wrap"><table><thead><tr><th>Student</th><th>Fee</th><th>Paid</th><th>Balance</th><th>Status</th><th>Payment Date</th><th>Action</th></tr></thead><tbody>
  ${ps.map(p=>{const s=student(p.studentId),st=statusFor(p,s);return `<tr><td><b>${esc(s.name)}</b><br><small class="muted">Grade ${esc(s.grade)} · ${esc(s.subject)}</small></td><td>${money(s.fee)}</td><td>${money(p.amount)}</td><td>${money(Math.max(s.fee-p.amount,0))}</td><td><span class="status ${st.toLowerCase()}">${st}</span></td><td>${p.date||"—"}</td><td><button class="btn btn-sm ${st==="Paid"?"btn-success":"btn-primary"}" onclick="openPaymentModal(${s.id})">${st==="Paid"?"Edit Payment":"Mark Paid"}</button> <button class="btn btn-sm btn-whatsapp" onclick="openInvoiceModal(${s.id},'${currentMonth}')">Invoice</button></td></tr>`}).join("")}</tbody></table></div>`;
  document.getElementById("payMonth").onchange=e=>{currentMonth=e.target.value;renderAll()};
}
function openPaymentModal(id=null){
  const month=currentMonth;
  const s=id?student(id):data.students[0];
  const p=id?paymentFor(id,month):{amount:"",date:new Date().toISOString().slice(0,10),note:""};
  openModal(`<div class="modal-head"><div><h2>Record Payment</h2><p class="modal-sub">Payments are recorded against the student's individual monthly fee.</p></div><button class="close" onclick="closeModal()">×</button></div>
  <form id="paymentForm"><div class="form-grid"><div class="full"><label>Student *</label><select name="studentId">${data.students.filter(s=>s.status==="Active").map(x=>`<option value="${x.id}" ${x.id===s?.id?"selected":""}>${esc(x.name)} — ${money(x.fee)}/month</option>`).join("")}</select></div><div><label>Month</label><input type="month" name="month" value="${month}"></div><div><label>Amount Paid (${esc(data.settings.currency)})</label><input type="number" name="amount" min="0" step=".01" value="${p.amount}"></div><div><label>Payment Date</label><input type="date" name="date" value="${p.date}"></div><div><label>Note</label><input name="note" value="${esc(p.note)}" placeholder="Optional"></div></div><div id="paymentHint" class="highlight" style="margin-top:15px;padding:12px"><div>Student fee: <b id="feeHint">${money(s?.fee||0)}</b></div></div><div class="modal-actions"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-success">Save Payment</button></div></form>`);
  const sel=document.querySelector("#paymentForm [name=studentId]");
  const updateHint=()=>{const ss=student(sel.value);document.getElementById("feeHint").textContent=money(ss.fee)};
  sel.onchange=updateHint;
  document.getElementById("paymentForm").onsubmit=e=>{
    e.preventDefault();const f=new FormData(e.target), sid=Number(f.get("studentId")), mon=f.get("month"), amt=Number(f.get("amount")||0), ss=student(sid), st=statusFor({amount:amt},ss);
    let existing=data.payments.find(x=>x.studentId===sid&&x.month===mon);
    if(existing) Object.assign(existing,{amount:amt,status:st,date:f.get("date"),note:f.get("note")});
    else data.payments.push({id:Date.now(),studentId:sid,month:mon,amount:amt,status:st,date:f.get("date"),note:f.get("note")});
    currentMonth=mon;save();closeModal();renderAll();showToast("Payment saved");
  };
}

function renderInvoices(){
  document.getElementById("page-invoices").innerHTML=`${pageHeader("Invoices","Create, print and send payment invoices through WhatsApp.",`<button class="btn btn-primary" onclick="openInvoiceModal()">＋ Create Invoice</button>`)}
  <div class="panel"><div class="panel-head"><h2>Invoice History</h2><span>Generated invoices are stored in this browser.</span></div>
  <div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Student</th><th>Month</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>${data.invoices.slice().reverse().map(i=>{const s=student(i.studentId);return `<tr><td><b>${i.number}</b></td><td>${esc(s?.name||"Deleted student")}</td><td>${monthName(i.month)}</td><td>${money(i.amount)}</td><td><span class="status ${i.status.toLowerCase()}">${i.status}</span></td><td><button class="btn btn-sm" onclick="previewInvoice('${i.number}')">View</button> <button class="btn btn-sm btn-whatsapp" onclick="sendWhatsApp('${i.number}')">WhatsApp</button></td></tr>`}).join("")||`<tr><td colspan="6"><div class="empty">No invoices created yet.</div></td></tr>`}</tbody></table></div></div>`;
}
function invoiceNumber(){return "INV-"+new Date().getFullYear()+"-"+String(data.invoices.length+1).padStart(5,"0")}
function openInvoiceModal(id=null,month=currentMonth){
  const s=id?student(id):data.students[0];
  openModal(`<div class="modal-head"><div><h2>Create Invoice</h2><p class="modal-sub">Choose the student and billing month.</p></div><button class="close" onclick="closeModal()">×</button></div>
  <form id="invoiceForm"><div class="form-grid"><div class="full"><label>Student</label><select name="studentId">${data.students.map(x=>`<option value="${x.id}" ${x.id===s?.id?"selected":""}>${esc(x.name)} — ${money(x.fee)}/month</option>`).join("")}</select></div><div><label>Billing Month</label><input type="month" name="month" value="${month}"></div><div><label>Amount</label><input name="amount" type="number" min="0" step=".01" value="${s?.fee||0}"></div></div><div class="modal-actions"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary">Create Invoice</button></div></form>`);
  const sel=document.querySelector("#invoiceForm [name=studentId]"), amt=document.querySelector("#invoiceForm [name=amount]");
  sel.onchange=()=>amt.value=student(sel.value).fee;
  document.getElementById("invoiceForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target), sid=Number(f.get("studentId")), mon=f.get("month"), ss=student(sid), p=paymentFor(sid,mon), inv={number:invoiceNumber(),studentId:sid,month:mon,amount:Number(f.get("amount")),status:statusFor(p,ss),created:new Date().toISOString()};data.invoices.push(inv);save();closeModal();renderAll();previewInvoice(inv.number)};
}
function previewInvoice(num){
  const i=data.invoices.find(x=>x.number===num);if(!i)return;const s=student(i.studentId);const p=paymentFor(i.studentId,i.month);
  openModal(`<div class="modal-head"><div><h2>Invoice Preview</h2><p class="modal-sub">${i.number}</p></div><button class="close" onclick="closeModal()">×</button></div>
  <div class="invoice-preview" id="printInvoice"><div class="invoice-head"><div><div class="invoice-brand">Zayne<span>Tutor</span></div><div class="muted">Learn · Improve · Succeed</div></div><div style="text-align:right"><b>INVOICE</b><br>${i.number}<br>${monthName(i.month)}</div></div>
  <p><b>Student:</b> ${esc(s.name)}<br><b>Grade:</b> ${esc(s.grade)}<br><b>Subject:</b> ${esc(s.subject)}<br><b>Parent/Guardian:</b> ${esc(s.guardian||"—")}</p>
  <div class="table-wrap"><table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody><tr><td>${monthName(i.month)} Tuition</td><td>${money(i.amount)}</td></tr></tbody></table></div>
  <div class="invoice-total">TOTAL: ${money(i.amount)}<div><span class="status ${i.status.toLowerCase()}">${i.status}</span></div></div>
  <p class="muted" style="margin-top:30px">Thank you for choosing ZayneTutor.</p></div>
  <div class="modal-actions"><button class="btn" onclick="printInvoice('${i.number}')">Print / Save PDF</button><button class="btn btn-whatsapp" onclick="sendWhatsApp('${i.number}')">Send via WhatsApp</button></div>`);
}
function printInvoice(num){
  const i=data.invoices.find(x=>x.number===num),s=student(i.studentId);
  const w=window.open("","_blank");w.document.write(`<html><head><title>${i.number}</title><style>body{font-family:Arial;padding:40px;color:#16213b}table{width:100%;border-collapse:collapse;margin-top:25px}th,td{padding:12px;border:1px solid #ddd;text-align:left}.brand{font-size:28px;font-weight:bold;color:#053199}.brand span{color:#ffb000}.total{text-align:right;font-size:22px;font-weight:bold;margin-top:25px}</style></head><body><div class="brand">Zayne<span>Tutor</span></div><h2>INVOICE</h2><p><b>${i.number}</b><br>${monthName(i.month)}</p><p><b>Student:</b> ${esc(s.name)}<br><b>Grade:</b> ${esc(s.grade)}<br><b>Subject:</b> ${esc(s.subject)}</p><table><tr><th>Description</th><th>Amount</th></tr><tr><td>${monthName(i.month)} Tuition</td><td>${money(i.amount)}</td></tr></table><div class="total">TOTAL: ${money(i.amount)}<br>${i.status}</div></body></html>`);w.document.close();w.print();
}
function sendWhatsApp(num){
  const i=data.invoices.find(x=>x.number===num),s=student(i.studentId);if(!s.phone){showToast("Add a WhatsApp number for this student first.");return}
  const clean=s.phone.replace(/[^\d]/g,"");const msg=`Hello ${s.guardian||""}, thank you for choosing ${data.settings.businessName}. Your ${monthName(i.month)} tuition invoice (${i.number}) for ${s.name} is ${money(i.amount)}. Payment status: ${i.status}. Thank you.`;
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`,"_blank");
}
function renderReports(){
  const totalExpected=data.students.filter(s=>s.status==="Active").reduce((a,s)=>a+s.fee*12,0);
  const avg=data.grades.length?Math.round(data.grades.reduce((a,g)=>a+g.score/g.max*100,0)/data.grades.length):0;
  document.getElementById("page-reports").innerHTML=`${pageHeader("Reports","See financial and academic performance at a glance.",`<button class="btn" onclick="exportCSV()">Export Payments CSV</button>`)}
  <div class="report-grid"><div class="card report-card"><h3>Monthly Expected</h3><div class="big">${money(expected())}</div><p>Based on each active student's individual fee.</p></div><div class="card report-card"><h3>Annual Run Rate</h3><div class="big">${money(totalExpected)}</div><p>Current monthly fees × 12 months.</p></div><div class="card report-card"><h3>Average Grade</h3><div class="big">${avg}%</div><p>Across all recorded assessments.</p></div></div>
  <div class="panel" style="margin-top:14px"><div class="panel-head"><h2>Outstanding Students — ${monthName(currentMonth)}</h2></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Fee</th><th>Paid</th><th>Outstanding</th><th>Action</th></tr></thead><tbody>${paymentsFor().filter(p=>statusFor(p,student(p.studentId))!=="Paid").map(p=>{const s=student(p.studentId);return `<tr><td>${esc(s.name)}</td><td>${money(s.fee)}</td><td>${money(p.amount)}</td><td>${money(Math.max(s.fee-p.amount,0))}</td><td><button class="btn btn-sm" onclick="openPaymentModal(${s.id})">Record Payment</button></td></tr>`}).join("")||`<tr><td colspan="5"><div class="empty">No outstanding payments.</div></td></tr>`}</tbody></table></div></div>`;
}
function exportCSV(){
  const rows=[["Student","Month","Fee","Paid","Balance","Status"]];
  data.payments.forEach(p=>{const s=student(p.studentId);if(s)rows.push([s.name,p.month,s.fee,p.amount,Math.max(s.fee-p.amount,0),statusFor(p,s)])});
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="zaynetutor-payments.csv";a.click();URL.revokeObjectURL(a.href);
}
function renderSettings(){
  const s=data.settings;
  document.getElementById("page-settings").innerHTML=`${pageHeader("Settings","Update your tutor and business details.",`<button class="btn btn-primary" onclick="saveSettings()">Save Settings</button>`)}
  <div class="settings-grid"><div class="panel"><h2>Business Details</h2><p class="muted">These details appear on invoices.</p><div class="form-grid" style="margin-top:18px"><div><label>Business Name</label><input id="setBusiness" value="${esc(s.businessName)}"></div><div><label>Tutor Name</label><input id="setTutor" value="${esc(s.tutorName)}"></div><div><label>WhatsApp / Phone</label><input id="setPhone" value="${esc(s.phone)}"></div><div><label>Email</label><input id="setEmail" value="${esc(s.email)}"></div><div><label>Currency Symbol</label><input id="setCurrency" value="${esc(s.currency)}"></div></div></div>
  <div class="panel danger-zone"><h2>Data</h2><p class="muted">This version stores data in your browser using localStorage.</p><button class="btn btn-danger" onclick="resetDemo()">Reset Demo Data</button><p class="muted" style="font-size:11px;margin-top:12px">For a real production system with multiple devices and secure backups, connect this interface to Node.js + MySQL.</p></div></div>`;
}
function saveSettings(){
  data.settings.businessName=document.getElementById("setBusiness").value.trim()||"ZayneTutor";
  data.settings.tutorName=document.getElementById("setTutor").value.trim()||"Tutor";
  data.settings.phone=document.getElementById("setPhone").value.trim();
  data.settings.email=document.getElementById("setEmail").value.trim();
  data.settings.currency=document.getElementById("setCurrency").value.trim()||"R";
  save();renderAll();showToast("Settings saved");
}
function resetDemo(){if(confirm("Reset all demo data? This cannot be undone.")){data=structuredClone(defaultData);save();renderAll();showToast("Demo data restored")}}
function navigate(page){
  currentPage=page;
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  document.getElementById("page-"+page).classList.add("active");
  document.querySelectorAll(".nav-link").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  if(window.innerWidth<760)document.getElementById("sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll(".nav-link").forEach(btn=>btn.onclick=()=>navigate(btn.dataset.page));
document.getElementById("modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal()});
document.getElementById("mobileMenu").onclick=()=>document.getElementById("sidebar").classList.toggle("open");
document.getElementById("globalSearch").oninput=e=>{
  const q=e.target.value.trim(); if(q){navigate("students");const input=document.getElementById("studentSearch");if(input){input.value=q;filterStudents()}}
};
document.getElementById("notificationBtn").onclick=()=>navigate("payments");
renderAll();
