const Book = require("../models/Book");
const fs = require("fs");

exports.createBook = (req, res, next) => {
  const bookObject = JSON.parse(req.body.book);
  delete bookObject._id;
  delete bookObject._userId;

  // Gestion intelligente des notes lors de la création
  let finalRatings = [];
  let finalAverageRating = 0;

  // Si l'utilisateur a donné une vraie note (> 0), on la conserve
  if (
    bookObject.ratings &&
    bookObject.ratings[0] &&
    bookObject.ratings[0].grade > 0
  ) {
    finalRatings = bookObject.ratings;
    finalAverageRating = bookObject.averageRating;
  } else {
    // Sinon, livre créé sans notation (ratings vide pour permettre notation ultérieure)
    finalRatings = [];
    finalAverageRating = 0;
  }

  const book = new Book({
    ...bookObject,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get("host")}/images/${req.file.filename}`,
  });
  book
    .save()
    .then(() => res.status(201).json({ message: "Livre enregistré !" }))
    .catch((error) => res.status(400).json({ error }));
};

exports.modifyBook = (req, res, next) => {
  const bookObject = req.file
    ? {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get("host")}/images/${req.file.filename}`,
      }
    : { ...req.body };

  delete bookObject._userId;

  // Recherche du livre à modifier
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (book.userId != req.auth.userId) {
        res.status(401).json({ message: "Not authorized" });
      } else {
        // SUPPRESSION DE L'ANCIENNE IMAGE SI NOUVELLE IMAGE UPLOADÉE
        if (req.file && book.imageUrl) {
          const oldImageName = book.imageUrl.split("/images/")[1];
          const oldImagePath = `images/${oldImageName}`;

          fs.unlink(oldImagePath, (error) => {
            if (error) {
              console.log("Erreur suppression ancienne image :", error.message);
            } else {
              console.log(`Ancienne image supprimée : ${oldImageName}`);
            }
          });
        }

        // Préparation des données à mettre à jour
        const updateData = {
          ...bookObject,
          ratings: bookObject.ratings || book.ratings,
          averageRating:
            bookObject.averageRating !== undefined
              ? bookObject.averageRating
              : book.averageRating,
        };

        Book.updateOne(
          { _id: req.params.id },
          { ...bookObject, _id: req.params.id },
        )
          .then(() => res.status(200).json({ message: "Livre modifié!" }))
          .catch((error) => res.status(401).json({ error }));
      }
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (book.userId !== req.auth.userId) {
        res.status(401).json({ message: "Non-autorisé !" });
      } else {
        const filename = book.imageUrl.split("/images/")[1];
        // Suppression du fichier image du serveur
        fs.unlink(`images/${filename}`, () => {
          // Suppression du livre de la base de données
          Book.deleteOne({ _id: req.params.id })
            .then(() => res.status(200).json({ message: "Objet supprimé !" }))
            .catch((error) => res.status(400).json({ error }));
        });
      }
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
};

exports.getOneBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => res.status(200).json(book))
    .catch((error) => res.status(404).json({ error }));
};

exports.getAllBooks = (req, res, next) => {
  Book.find()
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(400).json({ error }));
};

/*** NOTER UN LIVRE
(une seule fois par utilisateur)
 */
exports.rateBook = (req, res, next) => {
  const { rating } = req.body;

  // Validation : la note doit être entre 0 et 5
  if (rating < 0 || rating > 5) {
    return res
      .status(400)
      .json({ message: "La note doit être comprise entre 0 et 5" });
  }

  Book.findOne({ _id: req.params.id })
    .then((book) => {
      // Vérification que le livre existe
      if (!book) {
        return res.status(404).json({ message: "Livre non trouvé" });
      }

      // Vérification si l'utilisateur a déjà noté ce livre
      const existingRatingIndex = book.ratings.findIndex(
        (r) => r.userId === req.auth.userId,
      );

      if (existingRatingIndex !== -1) {
        // Empêche la double notation
        return res.status(400).json({
          message: "Vous avez déjà noté ce livre",
        });
      } else {
        // Ajout de la nouvelle note
        book.ratings.push({
          userId: req.auth.userId,
          grade: rating,
        });
      }

      // Recalcul de la moyenne de toutes les notes
      if (book.ratings.length > 0) {
        const totalRating = book.ratings.reduce((sum, r) => sum + r.grade, 0);
        book.averageRating =
          Math.round((totalRating / book.ratings.length) * 100) / 100;
      } else {
        book.averageRating = null;
      }

      // Sauvegarde des modifications
      return book.save();
    })
    .then((updatedBook) => {
      res.status(200).json(updatedBook);
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

/**
 * RÉCUPÉRER LE TOP 3 DES LIVRES LES MIEUX NOTÉS
 */
exports.getBestRating = (req, res, next) => {
  Book.find()
    .sort({ averageRating: -1 }) // Tri décroissant par moyenne
    .limit(3) // Limite à 3 résultats
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(400).json({ error }));
};
