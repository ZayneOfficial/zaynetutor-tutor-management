/* ZayneTutor Tutor Management System
   Browser UI backed by the authenticated Node.js API and MySQL.
*/
const API_BASE = window.ZAYNETUTOR_API_URL || "";
const TOKEN_KEY = "zaynetutor_token";
let token = localStorage.getItem(TOKEN_KEY);
let data = {
  settings: { tutorName: "Tutor", businessName: "ZayneTutor", phone: "", email: "", currency: "R" },
  students: [],
  payments: [],
  paymentHistory: [],
  grades: [],
  invoices: [],
};
let currentMonth = new Date().toISOString().slice(0,7);
let currentPage = "dashboard";
let registering = false;

async function api(path, options={}){
  const headers={...(options.body?{"Content-Type":"application/json"}:{}),...(token?{Authorization:`Bearer ${token}`}:{})};
  const response=await fetch(`${API_BASE}/api${path}`,{...options,headers:{...headers,...options.headers}});
  const body=await response.text();
  let result=null;
  if(body){
    try{result=JSON.parse(body)}catch{throw new Error(`The server returned an invalid response (${response.status}).`)}
  }
  if(response.status===401&&token&&!path.startsWith("/auth/")){
    signOut();
    showAuthError("Your session has expired. Sign in again.");
    throw new Error("Your session has expired. Sign in again.");
  }
  if(!response.ok) throw new Error(result?.error||`Request failed (${response.status}).`);
  return result;
}
async function refreshData(){
  const [students,grades,payments,paymentHistory,invoices,settings]=await Promise.all([
    api("/students"),
    api("/grades"),
    api(`/payments?month=${encodeURIComponent(currentMonth)}`),
    api("/payments/history"),
    api("/invoices"),
    api("/settings"),
  ]);
  data={students:students.students,grades:grades.grades,payments:payments.payments,paymentHistory:paymentHistory.payments,invoices:invoices.invoices,settings:settings.settings};
}
async function mutate(action,message,after=()=>{closeModal();renderAll()}){
  try{
    await action();
    await refreshData();
    after();
    showToast(message);
  }catch(error){
    showToast(error.message);
  }
}
async function changeMonth(month){
  if(!month)return;
  currentMonth=month;
  try{
    await refreshData();
    renderAll();
  }catch(error){
    showToast(error.message);
  }
}
function showAuthError(message=""){
  const error=document.getElementById("authError");
  error.textContent=message;
  error.hidden=!message;
}
function showAuth(){
  document.getElementById("appShell").hidden=true;
  document.getElementById("authScreen").hidden=false;
}
function showApp(){
  document.getElementById("authScreen").hidden=true;
  document.getElementById("appShell").hidden=false;
}
function updateAuthMode(){
  registering=!registering;
  document.getElementById("authNameField").hidden=!registering;
  document.getElementById("authName").required=registering;
  document.getElementById("authPassword").autocomplete=registering?"new-password":"current-password";
  document.getElementById("authPassword").minLength=registering?10:1;
  document.getElementById("authSubmit").textContent=registering?"Create Account":"Sign In";
  document.getElementById("authDescription").textContent=registering?"Create your tutor account to securely store your data.":"Sign in to manage your tutoring business.";
  document.getElementById("authToggle").textContent=registering?"Already have an account? Sign in":"Create a tutor account";
  showAuthError();
}
async function submitAuth(event){
  event.preventDefault();
  showAuthError();
  const form=new FormData(event.currentTarget);
  const credentials={email:String(form.get("email")).trim(),password:String(form.get("password"))};
  if(registering) credentials.name=String(form.get("name")).trim();
  const button=document.getElementById("authSubmit");
  button.disabled=true;
  try{
    const result=await api(registering?"/auth/register":"/auth/login",{method:"POST",body:JSON.stringify(credentials)});
    token=result.token;
    localStorage.setItem(TOKEN_KEY,token);
    await refreshData();
    showApp();
    renderAll();
  }catch(error){
    showAuthError(error.message);
  }finally{
    button.disabled=false;
  }
}
function signOut(){
  token=null;
  localStorage.removeItem(TOKEN_KEY);
  data={settings:{tutorName:"Tutor",businessName:"ZayneTutor",phone:"",email:"",currency:"R"},students:[],payments:[],paymentHistory:[],grades:[],invoices:[]};
  showAuth();
}
async function initializeApp(){
  if(!token){showAuth();return}
  try{
    await refreshData();
    showApp();
    renderAll();
  }catch(error){
    showAuth();
    showAuthError(error.message);
  }
}
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
  const [selectedYear,selectedMonth]=currentMonth.split("-").map(Number);
  const bars=Array.from({length:4},(_,index)=>{
    const date=new Date(selectedYear,selectedMonth-1-index,1);
    const month=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
    const receivedAmount=data.paymentHistory.filter(payment=>payment.month===month).reduce((sum,payment)=>sum+Number(payment.amount||0),0);
    return {label:date.toLocaleString("en-ZA",{month:"short"}),received:receivedAmount};
  }).reverse();
  const max=Math.max(...bars.map(bar=>bar.received),1);
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
        <div class="panel-head"><h2>Income Overview</h2><span>Received · Last 4 Months</span></div>
        <div class="metric-row"><div class="mini-metric"><small>Expected</small><strong>${money(ex)}</strong></div><div class="mini-metric"><small>Received</small><strong style="color:var(--green)">${money(rec)}</strong></div><div class="mini-metric"><small>Outstanding</small><strong style="color:var(--red)">${money(out)}</strong></div></div>
        <div class="bar-chart">${bars.map(bar=>`<div class="bar-col"><div class="bar received" title="Received ${money(bar.received)}" style="height:${Math.max(3,bar.received/max*150)}px"></div></div>`).join("")}</div>
        <div class="bar-labels">${bars.map(bar=>`<span>${bar.label}</span>`).join("")}</div>
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
  document.getElementById("dashMonth").onchange=e=>changeMonth(e.target.value);
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
    void mutate(()=>api(id?`/students/${id}`:"/students",{method:id?"PUT":"POST",body:JSON.stringify(obj)}),id?"Student updated":"Student added");
  };
}
function viewStudent(id){
  const s=student(id), grades=data.grades.filter(g=>g.studentId==id), avg=grades.length?Math.round(grades.reduce((a,g)=>a+(g.score/g.max*100),0)/grades.length):0;
  openModal(`<div class="modal-head"><div><h2>${esc(s.name)}</h2><p class="modal-sub">Grade ${esc(s.grade)} · ${esc(s.subject)} · ${money(s.fee)}/month</p></div><button class="close" onclick="closeModal()">×</button></div>
  <div class="metric-row"><div class="mini-metric"><small>Monthly Fee</small><strong>${money(s.fee)}</strong></div><div class="mini-metric"><small>Current Average</small><strong>${avg}%</strong></div><div class="mini-metric"><small>${monthName(currentMonth)}</small><strong>${statusFor(paymentFor(id),s)}</strong></div></div>
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
  document.getElementById("gradeForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),grade={studentId:Number(f.get("studentId")),term:f.get("term"),assessment:f.get("assessment"),score:Number(f.get("score")),max:Number(f.get("max")),date:f.get("date")};void mutate(()=>api("/grades",{method:"POST",body:JSON.stringify(grade)}),"Grade recorded")};
}
function viewGrades(id){
  const s=student(id), gs=data.grades.filter(g=>g.studentId==id);
  openModal(`<div class="modal-head"><div><h2>${esc(s.name)} — Grades</h2><p class="modal-sub">Grade ${esc(s.grade)} · ${esc(s.subject)}</p></div><button class="close" onclick="closeModal()">×</button></div>
  <div class="table-wrap"><table><thead><tr><th>Term</th><th>Assessment</th><th>Score</th><th>%</th><th>Date</th><th></th></tr></thead><tbody>${gs.slice().reverse().map(g=>`<tr><td>${esc(g.term)}</td><td>${esc(g.assessment)}</td><td>${g.score}/${g.max}</td><td>${Math.round(g.score/g.max*100)}%</td><td>${g.date}</td><td><button class="btn btn-sm btn-danger" onclick="deleteGrade(${g.id},${id})">Delete</button></td></tr>`).join("")||`<tr><td colspan="6">No grades yet.</td></tr>`}</tbody></table></div><div class="modal-actions"><button class="btn btn-primary" onclick="closeModal();openGradeModal(${id})">＋ Add Grade</button></div>`);
}
function deleteGrade(gid,sid){void mutate(()=>api(`/grades/${gid}`,{method:"DELETE"}),"Grade deleted",()=>{renderAll();viewGrades(sid)})}

function renderPayments(){
  const ps=paymentsFor();
  document.getElementById("page-payments").innerHTML=`${pageHeader("Payments","Mark each student's payment for the selected month.",`<input type="month" id="payMonth" value="${currentMonth}" style="width:170px"><button class="btn btn-primary" onclick="openPaymentModal()">＋ Record Payment</button>`)}
  <div class="cards" style="margin-bottom:15px"><div class="card kpi green"><div class="kpi-top"><span>Expected</span><div class="kpi-icon">R</div></div><h3>${money(expected())}</h3></div><div class="card kpi blue"><div class="kpi-top"><span>Received</span><div class="kpi-icon">✓</div></div><h3>${money(received())}</h3></div><div class="card kpi red"><div class="kpi-top"><span>Outstanding</span><div class="kpi-icon">!</div></div><h3>${money(outstanding())}</h3></div><div class="card kpi orange"><div class="kpi-top"><span>Fully Paid</span><div class="kpi-icon">%</div></div><h3>${ps.filter(p=>statusFor(p,student(p.studentId))==="Paid").length}</h3></div></div>
  <div class="table-wrap"><table><thead><tr><th>Student</th><th>Fee</th><th>Paid</th><th>Balance</th><th>Status</th><th>Payment Date</th><th>Action</th></tr></thead><tbody>
  ${ps.map(p=>{const s=student(p.studentId),st=statusFor(p,s);return `<tr><td><b>${esc(s.name)}</b><br><small class="muted">Grade ${esc(s.grade)} · ${esc(s.subject)}</small></td><td>${money(s.fee)}</td><td>${money(p.amount)}</td><td>${money(Math.max(s.fee-p.amount,0))}</td><td><span class="status ${st.toLowerCase()}">${st}</span></td><td>${p.date||"—"}</td><td><button class="btn btn-sm ${st==="Paid"?"btn-success":"btn-primary"}" onclick="openPaymentModal(${s.id})">${st==="Paid"?"Edit Payment":"Mark Paid"}</button> <button class="btn btn-sm btn-whatsapp" onclick="openInvoiceModal(${s.id},'${currentMonth}')">Invoice</button></td></tr>`}).join("")}</tbody></table></div>`;
  document.getElementById("payMonth").onchange=e=>changeMonth(e.target.value);
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
    e.preventDefault();const f=new FormData(e.target), sid=Number(f.get("studentId")), mon=f.get("month"), amt=Number(f.get("amount")||0);
    currentMonth=mon;
    void mutate(()=>api(`/payments/${sid}/${encodeURIComponent(mon)}`,{method:"PUT",body:JSON.stringify({amount:amt,date:f.get("date"),note:f.get("note")})}),"Payment saved");
  };
}

function renderInvoices(){
  document.getElementById("page-invoices").innerHTML=`${pageHeader("Invoices","Create, print and send payment invoices through WhatsApp.",`<button class="btn btn-primary" onclick="openInvoiceModal()">＋ Create Invoice</button>`)}
  <div class="panel"><div class="panel-head"><h2>Invoice History</h2><span>Invoices are stored in your account.</span></div>
  <div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Student</th><th>Month</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>${data.invoices.slice().reverse().map(i=>`<tr><td><b>${esc(i.number)}</b></td><td>${esc(i.studentName)}</td><td>${monthName(i.month)}</td><td>${money(i.amount)}</td><td><span class="status ${i.status.toLowerCase()}">${i.status}</span></td><td><button class="btn btn-sm" onclick="previewInvoice('${i.number}')">View</button> <button class="btn btn-sm btn-whatsapp" onclick="sendWhatsApp('${i.number}')">WhatsApp</button></td></tr>`).join("")||`<tr><td colspan="6"><div class="empty">No invoices created yet.</div></td></tr>`}</tbody></table></div></div>`;
}
function openInvoiceModal(id=null,month=currentMonth){
  const s=id?student(id):data.students[0];
  openModal(`<div class="modal-head"><div><h2>Create Invoice</h2><p class="modal-sub">Choose the student and billing month.</p></div><button class="close" onclick="closeModal()">×</button></div>
  <form id="invoiceForm"><div class="form-grid"><div class="full"><label>Student</label><select name="studentId">${data.students.map(x=>`<option value="${x.id}" ${x.id===s?.id?"selected":""}>${esc(x.name)} — ${money(x.fee)}/month</option>`).join("")}</select></div><div><label>Billing Month</label><input type="month" name="month" value="${month}"></div><div><label>Amount</label><input name="amount" type="number" min="0" step=".01" value="${s?.fee||0}"></div></div><div class="modal-actions"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary">Create Invoice</button></div></form>`);
  const sel=document.querySelector("#invoiceForm [name=studentId]"), amt=document.querySelector("#invoiceForm [name=amount]");
  sel.onchange=()=>amt.value=student(sel.value).fee;
  document.getElementById("invoiceForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),invoice={studentId:Number(f.get("studentId")),month:f.get("month"),amount:Number(f.get("amount"))};void mutate(async()=>{const result=await api("/invoices",{method:"POST",body:JSON.stringify(invoice)});return result.invoice},"Invoice created",()=>{renderAll();previewInvoice(data.invoices[0].number)})};
}
function previewInvoice(num){
  const i=data.invoices.find(x=>x.number===num);if(!i)return;const s={name:i.studentName,grade:i.grade,subject:i.subject,guardian:i.guardian};
  const invoiceMoney=value=>`${i.currency}${Number(value||0).toLocaleString("en-ZA",{minimumFractionDigits:0,maximumFractionDigits:2})}`;
  openModal(`<div class="modal-head"><div><h2>Invoice Preview</h2><p class="modal-sub">${i.number}</p></div><button class="close" onclick="closeModal()">×</button></div>
  <div class="invoice-preview" id="printInvoice"><div class="invoice-head"><div><div class="invoice-brand">${esc(i.businessName)}</div><div class="muted">Learn · Improve · Succeed</div></div><div style="text-align:right"><b>INVOICE</b><br>${i.number}<br>${monthName(i.month)}</div></div>
  <p><b>Student:</b> ${esc(s.name)}<br><b>Grade:</b> ${esc(s.grade)}<br><b>Subject:</b> ${esc(s.subject)}<br><b>Parent/Guardian:</b> ${esc(s.guardian||"—")}</p>
  <div class="table-wrap"><table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody><tr><td>${monthName(i.month)} Tuition</td><td>${invoiceMoney(i.amount)}</td></tr></tbody></table></div>
  <div class="invoice-total">TOTAL: ${invoiceMoney(i.amount)}<div><span class="status ${i.status.toLowerCase()}">${i.status}</span></div></div>
  <p class="muted" style="margin-top:30px">Thank you for choosing ${esc(i.businessName)}.</p></div>
  <div class="modal-actions"><button class="btn" onclick="printInvoice('${i.number}')">Print / Save PDF</button><button class="btn btn-whatsapp" onclick="sendWhatsApp('${i.number}')">Send via WhatsApp</button></div>`);
}
function printInvoice(num){
  const i=data.invoices.find(x=>x.number===num);if(!i)return;
  const invoiceMoney=value=>`${i.currency}${Number(value||0).toLocaleString("en-ZA",{minimumFractionDigits:0,maximumFractionDigits:2})}`;
  const w=window.open("","_blank");if(!w){showToast("Allow pop-ups to print this invoice.");return}
  w.document.write(`<html><head><title>${esc(i.number)}</title><style>body{font-family:Arial;padding:40px;color:#16213b}table{width:100%;border-collapse:collapse;margin-top:25px}th,td{padding:12px;border:1px solid #ddd;text-align:left}.brand{font-size:28px;font-weight:bold;color:#053199}.total{text-align:right;font-size:22px;font-weight:bold;margin-top:25px}</style></head><body><div class="brand">${esc(i.businessName)}</div><h2>INVOICE</h2><p><b>${esc(i.number)}</b><br>${monthName(i.month)}</p><p><b>Student:</b> ${esc(i.studentName)}<br><b>Grade:</b> ${esc(i.grade)}<br><b>Subject:</b> ${esc(i.subject)}</p><table><tr><th>Description</th><th>Amount</th></tr><tr><td>${monthName(i.month)} Tuition</td><td>${invoiceMoney(i.amount)}</td></tr></table><div class="total">TOTAL: ${invoiceMoney(i.amount)}<br>${i.status}</div></body></html>`);w.document.close();w.print();
}
function sendWhatsApp(num){
  const i=data.invoices.find(x=>x.number===num),s=student(i.studentId);if(!s?.phone){showToast("Add a WhatsApp number for this student first.");return}
  const clean=s.phone.replace(/[^\d]/g,"");const msg=`Hello ${i.guardian||""}, thank you for choosing ${i.businessName}. Your ${monthName(i.month)} tuition invoice (${i.number}) for ${i.studentName} is ${i.currency}${i.amount}. Payment status: ${i.status}. Thank you.`;
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
  data.paymentHistory.forEach(p=>rows.push([p.name,p.month,p.fee,p.amount,Math.max(p.fee-p.amount,0),p.status]));
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="zaynetutor-payments.csv";a.click();URL.revokeObjectURL(a.href);
}
function renderSettings(){
  const s=data.settings;
  document.getElementById("page-settings").innerHTML=`${pageHeader("Settings","Update your tutor and business details.",`<button class="btn btn-primary" onclick="saveSettings()">Save Settings</button>`)}
  <div class="settings-grid"><div class="panel"><h2>Business Details</h2><p class="muted">These details appear on invoices.</p><div class="form-grid" style="margin-top:18px"><div><label>Business Name</label><input id="setBusiness" value="${esc(s.businessName)}"></div><div><label>Tutor Name</label><input id="setTutor" value="${esc(s.tutorName)}"></div><div><label>WhatsApp / Phone</label><input id="setPhone" value="${esc(s.phone)}"></div><div><label>Account Email (read-only)</label><input id="setEmail" type="email" value="${esc(s.email)}" readonly></div><div><label>Currency Symbol</label><input id="setCurrency" value="${esc(s.currency)}"></div></div></div>
  <div class="panel danger-zone"><h2>Account Data</h2><p class="muted">Your students, payments, grades, invoices, and business settings are stored in the connected MySQL database and scoped to your tutor account.</p><p class="muted" style="font-size:11px;margin-top:12px">Database backups are managed by your hosting provider. Sign out on shared devices.</p></div></div>`;
}
function saveSettings(){
  const settings={
    businessName:document.getElementById("setBusiness").value.trim(),
    tutorName:document.getElementById("setTutor").value.trim(),
    phone:document.getElementById("setPhone").value.trim(),
    currency:document.getElementById("setCurrency").value.trim(),
  };
  void mutate(()=>api("/settings",{method:"PUT",body:JSON.stringify(settings)}),"Settings saved",()=>renderAll());
}
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
document.getElementById("authForm").addEventListener("submit",submitAuth);
document.getElementById("authToggle").onclick=updateAuthMode;
document.getElementById("signOut").onclick=signOut;
initializeApp();
