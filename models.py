from app import db

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50))
    color = db.Column(db.String(20))
    shape = db.Column(db.String(20))
