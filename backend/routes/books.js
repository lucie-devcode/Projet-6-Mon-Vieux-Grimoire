const express = require("express");
const router = express.Router();

const bookCtrl = require("../controllers/book");

// Route POST pour créer un book
router.post("/", bookCtrl.createBook);
// Route PUT pour modifier un book
router.put("/:id", bookCtrl.modifyBook);
// Route DELETE pour supprimer un book
router.delete("/:id", bookCtrl.deleteBook);
// Route GET pour récupérer un book spécifique
router.get("/:id", bookCtrl.getOneBook);
// Route GET pour récupérer tous les books
router.get("/", bookCtrl.getAllBooks);

module.exports = router;
