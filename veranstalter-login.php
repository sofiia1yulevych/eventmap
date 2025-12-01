<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Veranstalter-Login</title>

    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>

<main class="login-wrapper">
    <section class="login-card">
        <h1>Veranstalter-Login</h1>
        <p>Bitte melden Sie sich als Veranstalter an, um Ihre Events zu verwalten.</p>

        <form action="/veranstalter-login-check.php" method="POST" class="login-form">
            <label for="email">E-Mail</label>
            <input type="email" id="email" name="email" required>

            <label for="password">Passwort</label>
            <input type="password" id="password" name="password" required>

            <button type="submit">Einloggen</button>
        </form>
    </section>
</main>

<footer>
    <div class="social-icons">
        <a href="#"><i class="fa-brands fa-instagram"></i></a>
        <a href="#"><i class="fa-brands fa-facebook"></i></a>
        <a href="#"><i class="fa-brands fa-x-twitter"></i></a>
    </div>
</footer>

</body>
</html>