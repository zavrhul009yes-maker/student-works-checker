// ⚙️ ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ ИЗ SUPABASE
const SUPABASE_URL = 'https://zojrzpogkimwvfcuttts.supabase.co';
const SUPABASE_KEY = 'sb_publishable_InXDqXqXDAK3BL0ez1wZvg_zqW22h1v';
console.log('✅ App.js загружен');
console.log('Supabase URL:', SUPABASE_URL);

// Инициализация Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Функция проверки сессии
async function checkSession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (profile?.role === 'student' && window.location.pathname.includes('index.html')) {
            window.location.href = 'student.html';
        } else if (profile?.role === 'teacher' && window.location.pathname.includes('index.html')) {
            window.location.href = 'teacher.html';
        }
    }
}

// ========== СТРАНИЦА ВХОДА ==========
if (window.location.pathname.includes('index.html') || 
    window.location.pathname === '/' || 
    window.location.pathname.endsWith('/')) {
    
    console.log('📍 На странице входа');
    
    // Ждём загрузки DOM
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ DOM загружен');
        
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const messageDiv = document.getElementById('message');
        
        // Проверяем, что элементы найдены
        if (!loginTab) console.error('❌ Элемент loginTab не найден');
        if (!registerTab) console.error('❌ Элемент registerTab не найден');
        
        // Переключение вкладок
        if (loginTab && registerTab) {
            loginTab.onclick = () => {
                console.log('Вкладка Вход нажата');
                loginTab.classList.add('active');
                registerTab.classList.remove('active');
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
            };
            
            registerTab.onclick = () => {
                console.log('Вкладка Регистрация нажата');
                registerTab.classList.add('active');
                loginTab.classList.remove('active');
                registerForm.classList.remove('hidden');
                loginForm.classList.add('hidden');
            };
        }
        
        // РЕГИСТРАЦИЯ
        const regBtn = document.getElementById('doRegister');
        if (regBtn) {
            regBtn.onclick = async () => {
                console.log('🔘 Кнопка регистрации нажата');
                
                const email = document.getElementById('regEmail').value;
                const password = document.getElementById('regPassword').value;
                const fullName = document.getElementById('regName').value;
                const role = document.getElementById('regRole').value;
                
                console.log('Email:', email, 'Роль:', role);
                
                if (!email || !password || !fullName) {
                    messageDiv.innerHTML = '<span class="text-red-400">❌ Заполните все поля</span>';
                    return;
                }
                
                if (password.length < 6) {
                    messageDiv.innerHTML = '<span class="text-red-400">❌ Пароль должен быть минимум 6 символов</span>';
                    return;
                }
                
                try {
                    const { data, error } = await supabase.auth.signUp({
                        email: email,
                        password: password,
                        options: {
                            data: {
                                full_name: fullName,
                                role: role
                            }
                        }
                    });
                    
                    if (error) {
                        console.error('Ошибка регистрации:', error);
                        messageDiv.innerHTML = `<span class="text-red-400">❌ ${error.message}</span>`;
                    } else {
                        console.log('Регистрация успешна:', data);
                        messageDiv.innerHTML = '<span class="text-green-400">✅ Регистрация успешна! Теперь войдите.</span>';
                        // Очищаем форму
                        document.getElementById('regEmail').value = '';
                        document.getElementById('regPassword').value = '';
                        document.getElementById('regName').value = '';
                        // Переключаем на форму входа
                        loginTab.click();
                    }
                } catch (err) {
                    console.error('Исключение:', err);
                    messageDiv.innerHTML = '<span class="text-red-400">❌ Ошибка соединения</span>';
                }
            };
        } else {
            console.error('❌ Кнопка doRegister не найдена');
        }
        
        // ВХОД
        const loginBtn = document.getElementById('doLogin');
        if (loginBtn) {
            loginBtn.onclick = async () => {
                console.log('🔘 Кнопка входа нажата');
                
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                
                if (!email || !password) {
                    messageDiv.innerHTML = '<span class="text-red-400">❌ Введите email и пароль</span>';
                    return;
                }
                
                try {
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: email,
                        password: password
                    });
                    
                    if (error) {
                        console.error('Ошибка входа:', error);
                        messageDiv.innerHTML = `<span class="text-red-400">❌ ${error.message}</span>`;
                    } else {
                        console.log('Вход успешен:', data);
                        // Получаем роль пользователя
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
                } catch (err) {
                    console.error('Исключение:', err);
                    messageDiv.innerHTML = '<span class="text-red-400">❌ Ошибка соединения</span>';
                }
            };
        }
    });
}

// ========== СТУДЕНТ ==========
if (window.location.pathname.includes('student.html')) {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('📍 Страница студента');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        document.getElementById('logoutBtn').onclick = async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        };
        
        // Загрузка заданий
        const { data: assignments } = await supabase
            .from('assignments')
            .select('*');
        
        const tbody = document.getElementById('assignmentsTable');
        if (tbody) {
            if (!assignments?.length) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8">Нет работ</td></tr>';
            } else {
                tbody.innerHTML = assignments.map(a => `
                    <tr>
                        <td class="px-6 py-4">${a.title}</td>
                        <td class="px-6 py-4">${a.description || '-'}</td>
                        <td class="px-6 py-4">${a.due_date || '-'}</td>
                        <td class="px-6 py-4"><button onclick="alert("Сдача работ в разработке")" class="bg-rose-500 px-4 py-2 rounded">Сдать</button></td>
                    </tr>
                `).join('');
            }
        }
    });
}

// ========== ПРЕПОДАВАТЕЛЬ ==========
if (window.location.pathname.includes('teacher.html')) {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('📍 Страница преподавателя');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        document.getElementById('logoutBtn').onclick = async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        };
        
        document.getElementById('createAssignment').onclick = async () => {
            const title = document.getElementById('newTitle').value;
            if (!title) return alert('Введите название');
            
            await supabase.from('assignments').insert({
                title: title,
                description: document.getElementById('newDesc').value,
                due_date: document.getElementById('newDueDate').value,
                created_by: user.id
            });
            
            alert('Работа создана!');
            location.reload();
        };
    });
}

// Запускаем проверку сессии
checkSession();