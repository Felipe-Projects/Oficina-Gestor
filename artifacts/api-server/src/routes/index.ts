import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientesRouter from "./clientes";
import veiculosRouter from "./veiculos";
import pecasRouter from "./pecas";
import servicosRouter from "./servicos";
import ordensRouter from "./ordens";
import financeiroRouter from "./financeiro";
import dashboardRouter from "./dashboard";
import manutencaoRouter from "./manutencao";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/clientes", clientesRouter);
router.use("/veiculos", veiculosRouter);
router.use("/pecas", pecasRouter);
router.use("/servicos", servicosRouter);
router.use("/ordens", ordensRouter);
router.use("/financeiro", financeiroRouter);
router.use("/dashboard", dashboardRouter);
router.use("/manutencao", manutencaoRouter);

export default router;
