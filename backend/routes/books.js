const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const multer = require("../middleware/multer-config");

const bookCtrl = require("../controllers/book");

router.get("/bestrating", bookCtrl.getBestRating);

// Route POST pour créer un book
router.post("/", auth, multer, bookCtrl.createBook);
// Route PUT pour modifier un book
router.put("/:id", auth, multer, bookCtrl.modifyBook);
// Route DELETE pour supprimer un book
router.delete("/:id", auth, bookCtrl.deleteBook);
// Route GET pour récupérer un book spécifique
router.get("/:id", auth, bookCtrl.getOneBook);
// Route GET pour récupérer tous les books
router.get("/", auth, bookCtrl.getAllBooks);

// Route pour noter un livre
router.post("/:id/rating", auth, bookCtrl.rateBook);

module.exports = router;
