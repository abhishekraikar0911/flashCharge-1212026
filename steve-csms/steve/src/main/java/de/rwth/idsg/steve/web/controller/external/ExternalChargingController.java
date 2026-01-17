package de.rwth.idsg.steve.web.controller.external;

import de.rwth.idsg.steve.ocpp.OcppProtocol;
import de.rwth.idsg.steve.repository.dto.ChargePointSelect;
import de.rwth.idsg.steve.service.ChargePointServiceClient;
import de.rwth.idsg.steve.web.dto.ocpp.RemoteStartTransactionParams;
import de.rwth.idsg.steve.web.dto.ocpp.RemoteStopTransactionParams;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/external/charging")
@RequiredArgsConstructor
public class ExternalChargingController {

    private final ChargePointServiceClient chargePointServiceClient;

    private static final OcppProtocol PROTOCOL = OcppProtocol.V_16_JSON;

    @PostMapping("/start")
    public ResponseEntity<?> startCharging(@Valid @RequestBody StartRequest req) {

        RemoteStartTransactionParams params = new RemoteStartTransactionParams();

        ChargePointSelect cp = new ChargePointSelect(PROTOCOL, req.chargePointId());
        params.setChargePointSelectList(List.of(cp));

        params.setConnectorId(req.connectorId());
        params.setIdTag(req.idTag());

        int taskId = chargePointServiceClient.remoteStartTransaction(params);
        return ResponseEntity.ok(new ExternalResponse("START_ACCEPTED", taskId));
    }

    @PostMapping("/stop")
    public ResponseEntity<?> stopCharging(@Valid @RequestBody StopRequest req) {

        RemoteStopTransactionParams params = new RemoteStopTransactionParams();

        ChargePointSelect cp = new ChargePointSelect(PROTOCOL, req.chargePointId());
        params.setChargePointSelectList(List.of(cp));

        params.setTransactionId(req.transactionId());

        int taskId = chargePointServiceClient.remoteStopTransaction(params);
        return ResponseEntity.ok(new ExternalResponse("STOP_ACCEPTED", taskId));
    }

    // ---- DTOs ----

    public record StartRequest(String chargePointId, Integer connectorId, String idTag) {}
    public record StopRequest(String chargePointId, Integer transactionId) {}
    public record ExternalResponse(String status, Integer taskId) {}
}
