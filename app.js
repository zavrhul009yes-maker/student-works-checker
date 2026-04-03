// ⚙️ ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ ИЗ SUPABASE
const SUPABASE_URL = 'https://zojrzpogkimwvfcuttts.supabase.co';
const SUPABASE_KEY = 'sb_publishable_InXDqXqXDAK3BL0ez1wZvg_zqW22h1v';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUserAndRedirect() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    const currentPage = window.location.pathname;
    if (profile?.role === 'student' && !currentPage.includes('student.html')) {
        window.location.href = 'student.html';
    } else if (profile?.role === 'teacher' && !currentPage.includes('teacher.html')) {
        window.location.href = 'teacher.html';
    }
    return { user, profile };
}

// ------------------ СТРАНИЦА ВХОДА ------------------
if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const messageDiv = document.getElementById('message');

    loginTab.onclick = () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    };
    registerTab.onclick = () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    };

    document.getElementById('doLogin').onclick = async () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) messageDiv.innerText = error.message;
        else window.location.href = 'student.html';
    };

    document.getElementById('doRegister').onclick = async () => {
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const fullName = document.getElementById('regName').value;
        const role = document.getElementById('regRole').value;
        const { error } = await supabase.auth.signUp({
            email, password,
            options: { data: { full_name: fullName, role } }
        });
        if (error) messageDiv.innerText = error.message;
        else messageDiv.innerHTML = '<span class="text-green-400">✅ Регистрация успешна! Теперь войдите.</span>';
    };
}

// ------------------ СТУДЕНТ ------------------
if (window.location.pathname.includes('student.html')) {
    let currentUser = null;
    (async () => {
        const res = await checkUserAndRedirect();
        if (!res) return;
        currentUser = res.user;
        await loadAssignmentsTable();
        await loadResultsTable();
        await updateStats();
    })();

    document.getElementById('logoutBtn').onclick = async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    };

    async function updateStats() {
        const { data: assignments } = await supabase.from('assignments').select('*');
        const { data: submissions } = await supabase.from('submissions').select('grade, status').eq('student_id', currentUser.id);
        
        document.getElementById('totalAssignments').innerText = assignments?.length || 0;
        const completed = submissions?.filter(s => s.status === 'graded').length || 0;
        document.getElementById('completedCount').innerText = completed;
        const avg = submissions?.filter(s => s.grade).reduce((a,b) => a + b.grade, 0) / (submissions?.filter(s => s.grade).length || 1);
        document.getElementById('avgGrade').innerText = avg ? avg.toFixed(1) : '0';
        document.getElementById('pendingCount').innerText = `${completed}/${assignments?.length || 0}`;
    }

    async function loadAssignmentsTable() {
        const { data: assignments } = await supabase
            .from('assignments')
            .select('*')
            .order('created_at', { ascending: false });
        
        const tbody = document.getElementById('assignmentsTable');
        if (!assignments?.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500">Нет доступных работ</td></tr>';
            return;
        }
        tbody.innerHTML = assignments.map(a => `
            <tr>
                <td class="font-semibold">${a.title}</td>
                <td class="text-gray-400">${a.description || '—'}</td>
                <td class="text-gray-400">${a.due_date || 'Не указан'}</td>
                <td><button onclick="openSubmitModal('${a.id}')" class="neo-btn text-sm py-2 px-4"><i class="fas fa-upload mr-1"></i>Сдать</button></td>
            </tr>
        `).join('');
    }

    window.openSubmitModal = (assignmentId) => {
        document.getElementById('assignmentId').value = assignmentId;
        document.getElementById('submitModal').classList.remove('hidden');
    };

    document.getElementById('closeModal').onclick = () => {
        document.getElementById('submitModal').classList.add('hidden');
        document.getElementById('workText').value = '';
    };
    document.getElementById('submitWorkBtn').onclick = async () => {
        const assignmentId = document.getElementById('assignmentId').value;
        const workText = document.getElementById('workText').value;
        if (!workText) return alert('Введите текст работы');
        
        await supabase.from('submissions').insert({
            assignment_id: assignmentId,
            student_id: currentUser.id,
            work_text: workText,
            status: 'pending'
        });
        alert('✅ Работа отправлена!');
        document.getElementById('submitModal').classList.add('hidden');
        document.getElementById('workText').value = '';
        await loadResultsTable();
        await updateStats();
    };

    async function loadResultsTable() {
        const { data: subs } = await supabase
            .from('submissions')
            .select(`*, assignments(title)`)
            .eq('student_id', currentUser.id)
            .order('submitted_at', { ascending: false });
        
        const tbody = document.getElementById('resultsTable');
        if (!subs?.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">Вы ещё не сдавали работы</td></tr>';
            return;
        }
        tbody.innerHTML = subs.map(s => {
            let statusHtml = s.status === 'graded' 
                ? '<span class="badge-premium badge-graded"><i class="fas fa-check-circle"></i> Проверено</span>'
                : '<span class="badge-premium badge-pending"><i class="fas fa-clock"></i> Ожидает</span>';
            
            let gradeHtml = s.grade 
                ? `<span class="text-2xl font-bold text-rose-400">${s.grade}</span>`
                : '<span class="text-gray-500">—</span>';
            
            if (s.debt) gradeHtml = '<span class="badge-premium badge-debt"><i class="fas fa-exclamation-triangle"></i> Долг</span>';
            
            return `
                <tr>
                    <td class="font-semibold">${s.assignments?.title || 'Работа'}</td>
                    <td class="text-gray-400 max-w-xs truncate">${s.work_text || '—'}</td>
                    <td>${statusHtml}</td>
                    <td class="text-center">${gradeHtml}</td>
                    <td class="text-gray-400">${s.teacher_comment || '—'}</td>
                </tr>
            `;
        }).join('');
    }
}

// ------------------ ПРЕПОДАВАТЕЛЬ ------------------
if (window.location.pathname.includes('teacher.html')) {
    let teacherId = null;
    (async () => {
        const res = await checkUserAndRedirect();
        if (!res) return;
        teacherId = res.user.id;
        await loadSubmissionsTable();
    })();

    document.getElementById('logoutBtn').onclick = async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    };

    document.getElementById('createAssignment').onclick = async () => {
        const title = document.getElementById('newTitle').value;
        const desc = document.getElementById('newDesc').value;
        const dueDate = document.getElementById('newDueDate').value;
        if (!title) return alert('Введите название работы');
        await supabase.from('assignments').insert({
            title, description: desc, due_date: dueDate, created_by: teacherId
        });
        alert('✅ Работа создана!');
        document.getElementById('newTitle').value = '';
        document.getElementById('newDesc').value = '';
        document.getElementById('newDueDate').value = '';
        await loadSubmissionsTable();
    };

    async function loadSubmissionsTable() {
        const { data: submissions } = await supabase
            .from('submissions')
            .select(`*, assignments(title), profiles(full_name, email)`)
            .order('submitted_at', { ascending: false });
        
        const tbody = document.getElementById('submissionsTable');
        const pending = submissions?.filter(s => s.status !== 'graded').length || 0;
        document.getElementById('pendingSubmissionsCount').innerText = pending;
        
        if (!submissions?.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Нет сданных работ</td></tr>';
            return;
        }
        tbody.innerHTML = submissions.map(s => {
            let statusHtml = s.status === 'graded' 
                ? '<span class="status-badge status-graded"><i class="fas fa-check-circle"></i> Оценено</span>'
                : '<span class="status-badge status-pending"><i class="fas fa-hourglass-half"></i> На проверке</span>';
            
            let gradeHtml = s.grade 
                ? `<span class="text-xl font-bold ${s.debt ? 'text-rose-400' : 'text-green-400'}">${s.grade}</span>`
                : '<span class="text-gray-500">—</span>';
            
            let actionHtml = s.status !== 'graded' 
                ? `<button onclick="openGradeModal('${s.id}', '${(s.profiles?.full_name || s.profiles?.email).replace(/'/g, "\\'")}', '${(s.work_text || '').replace(/'/g, "\\'")}')" class="btn-grade"><i class="fas fa-star mr-1"></i>Оценить</button>`
                : '<span class="text-green-500 text-sm"><i class="fas fa-check"></i> Готово</span>';
            
            return `
                <tr>
                    <td class="font-semibold">${s.assignments?.title || '—'}</td>
                    <td><i class="fas fa-user-graduate text-gray-500 mr-1"></i> ${s.profiles?.full_name || s.profiles?.email}</td>
                    <td class="text-gray-400 max-w-xs truncate">${s.work_text || '—'}</td>
                    <td>${statusHtml}</td>
                    <td class="text-center font-bold">${gradeHtml}</td>
                    <td>${actionHtml}</td>
                </tr>
            `;
        }).join('');
    }

    window.openGradeModal = (id, studentName, workText) => {
        document.getElementById('gradingSubmissionId').value = id;
        document.getElementById('gradeStudentName').innerHTML = `<i class="fas fa-user-graduate text-rose-400 mr-2"></i><strong>${studentName}</strong>`;
        document.getElementById('gradeWorkText').innerText = workText || 'Текст работы не указан';
        document.getElementById('gradeModal').classList.remove('hidden');
    };

    document.getElementById('closeGradeModal').onclick = () => {
        document.getElementById('gradeModal').classList.add('hidden');
        document.getElementById('gradeValue').value = '';
        document.getElementById('debtCheckbox').checked = false;
        document.getElementById('commentText').value = '';
    };
    document.getElementById('saveGradeBtn').onclick = async () => {
        const submissionId = document.getElementById('gradingSubmissionId').value;
        const grade = parseInt(document.getElementById('gradeValue').value);
        const debt = document.getElementById('debtCheckbox').checked;
        const comment = document.getElementById('commentText').value;
        
        if (grade && (grade < 2 || grade > 5)) return alert('Оценка должна быть от 2 до 5');
        
        await supabase.from('submissions').update({
            grade: grade || null,
            debt: debt,
            teacher_comment: comment,
            status: 'graded',
            graded_at: new Date()
        }).eq('id', submissionId);
        
        alert('✅ Оценка сохранена!');
        document.getElementById('gradeModal').classList.add('hidden');
        document.getElementById('gradeValue').value = '';
        document.getElementById('debtCheckbox').checked = false;
        document.getElementById('commentText').value = '';
        await loadSubmissionsTable();
    };
}