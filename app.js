// ========== ВАШИ ДАННЫЕ SUPABASE ==========
// ⚠️ ЗАМЕНИТЕ НА ВАШИ РЕАЛЬНЫЕ ДАННЫЕ!
const SUPABASE_URL = 'https://blbepumshozabaedziyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_a8F9w2IOPczUhSML5psZ0A_kn6ar1oj';
// ==========================================

// Инициализация
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('✅ App.js загружен');
console.log('Supabase URL:', SUPABASE_URL);

// ========== ОБЩАЯ ФУНКЦИЯ ПРОВЕРКИ ==========
async function checkUserAndRedirect() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
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

// ========== СТРАНИЦА ВХОДА ==========
if (window.location.pathname.includes('index.html') || 
    window.location.pathname === '/' || 
    window.location.pathname === '/index.html') {
    
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Страница входа загружена');
        
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const messageDiv = document.getElementById('message');
        
        // Переключение вкладок
        if (loginTab && registerTab) {
            loginTab.onclick = () => {
                loginTab.className = 'tab-active flex-1 py-2 rounded-lg font-semibold transition-all';
                registerTab.className = 'tab-inactive flex-1 py-2 rounded-lg font-semibold transition-all';
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
            };
            
            registerTab.onclick = () => {
                registerTab.className = 'tab-active flex-1 py-2 rounded-lg font-semibold transition-all';
                loginTab.className = 'tab-inactive flex-1 py-2 rounded-lg font-semibold transition-all';
                registerForm.classList.remove('hidden');
                loginForm.classList.add('hidden');
            };
        }
        
        // РЕГИСТРАЦИЯ
        const doRegister = document.getElementById('doRegister');
        if (doRegister) {
            doRegister.onclick = async () => {
                console.log('Кнопка регистрации нажата');
                const name = document.getElementById('regName').value;
                const email = document.getElementById('regEmail').value;
                const password = document.getElementById('regPassword').value;
                const role = document.getElementById('regRole').value;
                
                if (!name || !email || !password) {
                    messageDiv.innerHTML = '<span class="text-red-500">❌ Заполните все поля</span>';
                    return;
                }
                
                if (password.length < 6) {
                    messageDiv.innerHTML = '<span class="text-red-500">❌ Пароль должен быть не менее 6 символов</span>';
                    return;
                }
                
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: { data: { full_name: name, role: role } }
                });
                
                if (error) {
                    console.error('Ошибка:', error);
                    messageDiv.innerHTML = `<span class="text-red-500">❌ ${error.message}</span>`;
                } else {
                    console.log('Успех:', data);
                    messageDiv.innerHTML = '<span class="text-green-500">✅ Регистрация успешна! Теперь войдите.</span>';
                    // Очищаем поля
                    document.getElementById('regName').value = '';
                    document.getElementById('regEmail').value = '';
                    document.getElementById('regPassword').value = '';
                    // Переключаем на вход
                    loginTab.click();
                }
            };
        }
        
        // ВХОД
        const doLogin = document.getElementById('doLogin');
        if (doLogin) {
            doLogin.onclick = async () => {
                console.log('Кнопка входа нажата');
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                
                if (!email || !password) {
                    messageDiv.innerHTML = '<span class="text-red-500">❌ Введите email и пароль</span>';
                    return;
                }
                
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (error) {
                    console.error('Ошибка:', error);
                    messageDiv.innerHTML = `<span class="text-red-500">❌ ${error.message}</span>`;
                } else {
                    console.log('Вход успешен');
                    // Получаем роль
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', data.user.id)
                        .single();
                    
                    if (profile?.role === 'teacher') {
                        window.location.href = 'teacher.html';
                    } else {
                        window.location.href = 'student.html';
                    }
                }
            };
        }
    });
}

// ========== СТУДЕНТ ==========
if (window.location.pathname.includes('student.html')) {
    let currentUserId = null;
    
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('Страница студента загружена');
        
        const session = await checkUserAndRedirect();
        if (!session) return;
        currentUserId = session.user.id;
        
        // Кнопка выхода
        document.getElementById('logoutBtn').onclick = async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        };
        
        // Загружаем данные
        await loadAssignments();
        await loadSubmissions();
        
        // Модалка
        document.getElementById('closeModal').onclick = () => {
            document.getElementById('submitModal').classList.add('hidden');
        };
        
        document.getElementById('submitWorkBtn').onclick = async () => {
            const assignmentId = document.getElementById('assignmentId').value;
            const workText = document.getElementById('workText').value;
            
            if (!workText) {
                alert('Введите текст работы');
                return;
            }
            
            const { error } = await supabase.from('submissions').insert({
                assignment_id: assignmentId,
                student_id: currentUserId,
                work_text: workText,
                status: 'pending'
            });
            
            if (error) {
                alert('Ошибка: ' + error.message);
            } else {
                alert('✅ Работа отправлена!');
                document.getElementById('submitModal').classList.add('hidden');
                document.getElementById('workText').value = '';
                await loadSubmissions();
            }
        };
    });
    
    async function loadAssignments() {
        const { data: assignments, error } = await supabase
            .from('assignments')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Ошибка загрузки заданий:', error);
            return;
        }
        
        const tbody = document.getElementById('assignmentsTable');
        if (!assignments || assignments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-gray-500">Нет доступных работ</td></tr>';
            return;
        }
        
        tbody.innerHTML = assignments.map(a => `
            <tr class="border-b">
                <td class="p-3 font-medium">${escapeHtml(a.title)}</td>
                <td class="p-3 text-gray-600">${escapeHtml(a.description || '-')}</td>
                <td class="p-3 text-gray-600">${a.due_date || '-'}</td>
                <td class="p-3 text-center">
                    <button onclick="window.openSubmitModal('${a.id}')" class="btn-submit">📤 Сдать</button>
                </td>
            </tr>
        `).join('');
    }
    
    window.openSubmitModal = (assignmentId) => {
        document.getElementById('assignmentId').value = assignmentId;
        document.getElementById('submitModal').classList.remove('hidden');
    };
    
    async function loadSubmissions() {
        const { data: subs, error } = await supabase
            .from('submissions')
            .select(`*, assignments(title)`)
            .eq('student_id', currentUserId)
            .order('submitted_at', { ascending: false });
        
        if (error) {
            console.error('Ошибка загрузки результатов:', error);
            return;
        }
        
        const tbody = document.getElementById('resultsTable');
        if (!subs || subs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-gray-500">Вы ещё не сдавали работы</td></tr>';
            return;
        }
        
        tbody.innerHTML = subs.map(s => {
            let statusHtml = s.status === 'graded' 
                ? '<span class="status-badge status-graded">✅ Проверено</span>'
                : '<span class="status-badge status-pending">⏳ Ожидает</span>';
            
            let gradeHtml = s.grade 
                ? `<span class="font-bold text-lg ${s.debt ? 'text-red-600' : 'text-green-600'}">${s.grade}</span>`
                : '-';
            
            if (s.debt && !s.grade) gradeHtml = '<span class="text-red-600 font-bold">❗ Долг</span>';
            
            return `
                <tr class="border-b">
                    <td class="p-3">${escapeHtml(s.assignments?.title || 'Работа')}</td>
                    <td class="p-3 text-gray-600 max-w-xs truncate">${escapeHtml(s.work_text || '-')}</td>
                    <td class="p-3 text-center">${statusHtml}</td>
                    <td class="p-3 text-center">${gradeHtml}</td>
                    <td class="p-3 text-gray-600">${escapeHtml(s.teacher_comment || '-')}</td>
                </tr>
            `;
        }).join('');
    }
}

// ========== ПРЕПОДАВАТЕЛЬ ==========
if (window.location.pathname.includes('teacher.html')) {
    let teacherId = null;
    
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('Страница преподавателя загружена');
        
        const session = await checkUserAndRedirect();
        if (!session) return;
        teacherId = session.user.id;
        
        // Кнопка выхода
        document.getElementById('logoutBtn').onclick = async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        };
        
        // Создание работы
        document.getElementById('createAssignment').onclick = async () => {
            const title = document.getElementById('newTitle').value;
            if (!title) {
                alert('Введите название работы');
                return;
            }
            
            const { error } = await supabase.from('assignments').insert({
                title: title,
                description: document.getElementById('newDesc').value,
                due_date: document.getElementById('newDueDate').value,
                created_by: teacherId
            });
            
            if (error) {
                alert('Ошибка: ' + error.message);
            } else {
                alert('✅ Работа создана!');
                document.getElementById('newTitle').value = '';
                document.getElementById('newDesc').value = '';
                document.getElementById('newDueDate').value = '';
                await loadSubmissions();
            }
        };
        
        // Модалка оценки
        document.getElementById('closeGradeModal').onclick = () => {
            document.getElementById('gradeModal').classList.add('hidden');
        };
        
        document.getElementById('saveGradeBtn').onclick = async () => {
            const submissionId = document.getElementById('gradingSubmissionId').value;
            const grade = parseInt(document.getElementById('gradeValue').value);
            const debt = document.getElementById('debtCheckbox').checked;
            const comment = document.getElementById('commentText').value;
            
            if (grade && (grade < 2 || grade > 5)) {
                alert('Оценка должна быть от 2 до 5');
                return;
            }
            
            const { error } = await supabase
                .from('submissions')
                .update({
                    grade: grade || null,
                    debt: debt,
                    teacher_comment: comment,
                    status: 'graded',
                    graded_at: new Date()
                })
                .eq('id', submissionId);
            
            if (error) {
                alert('Ошибка: ' + error.message);
            } else {
                alert('✅ Оценка сохранена!');
                document.getElementById('gradeModal').classList.add('hidden');
                document.getElementById('gradeValue').value = '';
                document.getElementById('debtCheckbox').checked = false;
                document.getElementById('commentText').value = '';
                await loadSubmissions();
            }
        };
        
        await loadSubmissions();
    });
    
    async function loadSubmissions() {
        const { data: submissions, error } = await supabase
            .from('submissions')
            .select(`*, assignments(title), profiles(full_name, email)`)
            .order('submitted_at', { ascending: false });
        
        if (error) {
            console.error('Ошибка загрузки:', error);
            return;
        }
        
        const tbody = document.getElementById('submissionsTable');
        if (!submissions || submissions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-500">Нет сданных работ</td></tr>';
            return;
        }
        
        tbody.innerHTML = submissions.map(s => {
            let statusHtml = s.status === 'graded'
                ? '<span class="status-graded">✅ Оценено</span>'
                : '<span class="status-pending">⏳ На проверке</span>';
            
            let gradeHtml = s.grade 
                ? `<span class="font-bold ${s.debt ? 'text-red-600' : 'text-green-600'}">${s.grade}</span>`
                : '-';
            
            let actionHtml = s.status !== 'graded'
                ? `<button onclick="window.openGradeModal('${s.id}', '${escapeHtml(s.profiles?.full_name || s.profiles?.email)}', '${escapeHtml(s.work_text || '')}')" class="btn-grade px-3 py-1 rounded">✏️ Оценить</button>`
                : '<span class="text-green-500">✓ Готово</span>';
            
            return `
                <tr class="border-b">
                    <td class="p-3">${escapeHtml(s.assignments?.title || '-')}</td>
                    <td class="p-3">${escapeHtml(s.profiles?.full_name || s.profiles?.email)}</td>
                    <td class="p-3 text-gray-600 max-w-xs truncate">${escapeHtml(s.work_text || '-')}</td>
                    <td class="p-3 text-center">${statusHtml}</td>
                    <td class="p-3 text-center font-bold">${gradeHtml}</td>
                    <td class="p-3 text-center">${actionHtml}</td>
                </tr>
            `;
        }).join('');
    }
    
    window.openGradeModal = (id, studentName, workText) => {
        document.getElementById('gradingSubmissionId').value = id;
        document.getElementById('gradeStudentName').innerHTML = `👨‍🎓 ${studentName}`;
        document.getElementById('gradeWorkText').innerText = workText || 'Текст работы не указан';
        document.getElementById('gradeModal').classList.remove('hidden');
    };
}

// Вспомогательная функция для безопасности
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Запускаем проверку
checkUserAndRedirect();