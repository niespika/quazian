-- CreateIndex
CREATE UNIQUE INDEX "Attempt_userId_quizId_key" ON "Attempt"("userId", "quizId");
