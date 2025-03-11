const express = require("express");
const fs = require("fs").promises;

const app = express();

app.use(express.json());

// Загрузка списка пользователей при старте приложения
let users = [];
try {
  const fileContent = await fs.readFile("users.json", "utf8");
  users = JSON.parse(fileContent);
} catch (error) {
  console.error("Ошибка загрузки users.json:", error);
}

// Логика обработки запросов

app.get("/api/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = users.find(u => u.id === id);
    if (user) {
      res.json({ success: true, message: user });
    } else {
      res.status(404).json({ success: false, message: "Пользователь не найден" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { name, age } = req.body;
    if (!name || !age) {
      return res.status(400).json({ success: false, message: "Заполните все поля" });
    }

    // Проверка валидности данных
    const validationErrors = validateUserData({ name, age });
    if (validationErrors.length > 0) {
      return res.status(422).json({ success: false, errors: validationErrors });
    }

    // Проверка уникальности имени пользователя
    if (!isUserNameUnique(users, { name })) {
      return res.status(409).json({ success: false, message: "Такое имя пользователя уже существует" });
    }

    // Генерация нового идентификатора
    const nextId = getNextId(users);
    const newUser = { id: nextId, name, age };
    users.push(newUser);

    // Сохранение изменений в файл
    await saveUsersToFile(users);

    // Ответ клиенту
    res.json({ success: true, message: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Пользователь не найден" });
    }
    const removedUser = users.splice(index, 1)[0];
    await saveUsersToFile(users);
    res.json({ success: true, message: removedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Вспомогательные функции

function validateUserData(user) {
  const errors = [];
  const nameRegex = /^[a-zA-Z\s]+$/; // Только буквы и пробелы
  const ageRegex = /^\d+$/; // Положительное целое число

  if (!nameRegex.test(user.name)) {
    errors.push("Имя пользователя должно содержать только буквы и пробелы.");
  }
  if (!ageRegex.test(user.age)) {
    errors.push("Возраст должен быть положительным целым числом.");
  }
  return errors;
}

function isUserNameUnique(users, newUser) {
  return !users.some(user => user.name === newUser.name);
}

function getNextId(users) {
  return users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
}

async function saveUsersToFile(users) {
  try {
    await fs.writeFile("users.json", JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Ошибка сохранения users.json:", error);
  }
}

// Резервное копирование и логирование
const logOperation = async (message) => {
  try {
    const logMessage = `${new Date().toISOString()} - ${message}\n`;
    await fs.appendFile("logs.txt", logMessage);
  } catch (error) {
    console.error("Ошибка логирования:", error);
  }
};

const createBackup = async () => {
  try {
    await fs.copyFile("users.json", "users_backup.json");
  } catch (error) {
    console.error("Ошибка создания резервной копии:", error);
  }
};

// Запуск сервера
app.listen(3000, () => {
  console.log("Сервер ожидает подключения на http://localhost:3000");
});