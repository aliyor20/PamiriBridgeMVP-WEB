import { useState, useEffect, createContext, useContext } from 'react';

const LanguageContext = createContext();

export const translations = {
    en: {
        nav: {
            home: 'Home',
            explore: 'Explore',
            lexicon: 'Dictionary',
            profile: 'Profile'
        },
        screensaver: {
            unlock: 'Unlock Pamiri Bridge'
        },
        home: {
            morning: 'Good Morning',
            afternoon: 'Good Afternoon',
            evening: 'Good Evening',
            your_impact: 'Your Impact',
            contributions: 'Contributions',
            verified: 'Verified',
            reputation: 'Reputation',
            practice_title: 'Daily Practice',
            select_word: 'Select the Pamiri word for:'
        },
        explore: {
            title: 'Explore',
            subtitle: 'Discover the world of Pamiri',
            search_placeholder: 'Search history and stories...',
            listen: 'Listen to the beauty of the Pamiri language.',
            no_results: 'No stories found matching your search.',
            read_more: 'Read More',
            coming_soon: 'Visual stories coming soon'
        },
        lexicon: {
            title: 'Dictionary',
            dialect_all: 'All',
            dialect_shughni: 'Shughni',
            dialect_rushani: 'Rushani',
            dialect_wakhi: 'Wakhi',
            dialect_sariqoli: 'Sariqoli',
            dialect_ishkashimi: 'Ishkashimi',
            dialect_yazgulyami: 'Yazgulyami',
            dialect_munjani: 'Munjani',
            search_placeholder: 'Search Pamiri words...',
            audio_playback: 'Audio playback not supported',
            no_results: 'No words found matching your search.',
            meaning: 'Meaning',
            example: 'Example',
            contributed_by: 'Contributed by'
        },
        profile: {
            login_title: 'Sign in to Pamiri Bridge',
            login_subtitle: 'Enter your credentials below',
            email: 'Email address',
            password: 'Password',
            login_btn: 'Sign In',
            login_loading: 'Signing in...',
            no_account: "Don't have an account?",
            signup_link: 'Sign Up',
            signup_title: 'Create an Account',
            signup_subtitle: 'Join the community',
            display_name: 'Display Name',
            signup_btn: 'Sign Up',
            signup_loading: 'Creating account...',
            has_account: 'Already have an account?',
            login_link: 'Sign In',
            badges: 'Badges Shelf',
            history: 'Contribution History',
            search_history: 'Search past contributions...',
            no_history: 'No local history found.',
            sign_out: 'Sign Out',
            settings: 'Settings'
        },
        settings: {
            title: 'Settings',
            theme: 'Theme',
            choose_theme: 'Choose Theme',
            theme_desc: 'Select the color that cascades across the UI.',
            app_language: 'App Language',
            native_language: 'Native Language',
            language_desc: 'This impacts which language is displayed during quizzes.',
            english: 'English',
            russian: 'Russian',
            about_title: 'About Pamiri Bridge',
            version: 'Version',
            mission: 'Mission',
            mission_desc: 'Dedicated to the rigorous preservation and crowdsourced documentation of the Pamiri languages.',
            view_guide: 'View Navigation Guide',
            admin_panel: 'Admin Panel',
            close: 'Close'
        },
        install: {
            app_available: 'App Available',
            download_android: 'Download for Android',
            install_ios: 'Install on iOS'
        }
    },
    ru: {
        nav: {
            home: 'Главная',
            explore: 'Обзор',
            lexicon: 'Словарь',
            profile: 'Профиль'
        },
        screensaver: {
            unlock: 'Открыть Памирский Мост'
        },
        home: {
            morning: 'Доброе утро',
            afternoon: 'Добрый день',
            evening: 'Добрый вечер',
            your_impact: 'Ваш вклад',
            contributions: 'Вклады',
            verified: 'Проверено',
            reputation: 'Репутация',
            practice_title: 'Ежедневная практика',
            select_word: 'Выберите Памирское слово для:'
        },
        explore: {
            title: 'Обзор',
            subtitle: 'Откройте для себя мир Памира',
            search_placeholder: 'Поиск историй...',
            listen: 'Послушайте красоту Памирского языка.',
            no_results: 'Истории не найдены.',
            read_more: 'Читать далее',
            coming_soon: 'Визуальные истории скоро появятся'
        },
        lexicon: {
            title: 'Словарь',
            dialect_all: 'Все',
            dialect_shughni: 'Шугнанский',
            dialect_rushani: 'Рушанский',
            dialect_wakhi: 'Ваханский',
            dialect_sariqoli: 'Сарыкольский',
            dialect_ishkashimi: 'Ишкашимский',
            dialect_yazgulyami: 'Язгулямский',
            dialect_munjani: 'Мунджанский',
            search_placeholder: 'Поиск Памирских слов...',
            audio_playback: 'Воспроизведение аудио не поддерживается',
            no_results: 'Слова не найдены.',
            meaning: 'Значение',
            example: 'Пример',
            contributed_by: 'Добавлено'
        },
        profile: {
            login_title: 'Войти в Памирский Мост',
            login_subtitle: 'Введите свои учетные данные ниже',
            email: 'Адрес электронной почты',
            password: 'Пароль',
            login_btn: 'Войти',
            login_loading: 'Вход...',
            no_account: "Нет аккаунта?",
            signup_link: 'Зарегистрироваться',
            signup_title: 'Создать Аккаунт',
            signup_subtitle: 'Присоединяйтесь к сообществу',
            display_name: 'Имя пользователя',
            signup_btn: 'Зарегистрироваться',
            signup_loading: 'Создание аккаунта...',
            has_account: 'Уже есть аккаунт?',
            login_link: 'Войти',
            badges: 'Полка с достижениями',
            history: 'История вкладов',
            search_history: 'Поиск прошлых вкладов...',
            no_history: 'Локальная история не найдена.',
            sign_out: 'Выйти',
            settings: 'Настройки'
        },
        settings: {
            title: 'Настройки',
            theme: 'Тема',
            choose_theme: 'Выбрать Тему',
            theme_desc: 'Выберите цвет, который будет применяться ко всему интерфейсу.',
            app_language: 'Язык Приложения',
            native_language: 'Родной Язык',
            language_desc: 'Это влияет на то, какой язык отображается во время викторин.',
            english: 'Английский',
            russian: 'Русский',
            about_title: 'О Pamiri Bridge',
            version: 'Версия',
            mission: 'Миссия',
            mission_desc: 'Посвящается тщательному сохранению и краудсорсинговому документированию памирских языков.',
            view_guide: 'Посмотреть Руководство',
            admin_panel: 'Панель Администратора',
            close: 'Закрыть'
        },
        install: {
            app_available: 'Приложение доступно',
            download_android: 'Скачать для Android',
            install_ios: 'Установить на iOS'
        }
    }
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('pb_app_language') || 'en';
    });

    useEffect(() => {
        localStorage.setItem('pb_app_language', language);
    }, [language]);

    const t = (keyString) => {
        const keys = keyString.split('.');
        let current = translations[language];
        for (const key of keys) {
            if (current[key] === undefined) {
                console.warn(`Translation key not found: ${keyString}`);
                return keyString;
            }
            current = current[key];
        }
        return current;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
