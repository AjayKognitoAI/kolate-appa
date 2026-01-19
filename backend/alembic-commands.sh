alembic revision --autogenerate -m "Initial setup"
alembic heads
alembic merge -m "merge multiple heads" <revision1> <revision2>
